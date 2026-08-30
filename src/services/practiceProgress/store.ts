import type { Question } from "../../models/question/types";
import { createProgressSnapshot } from "../../models/question/progress";
import {
  notifyStorageChanged,
  registerStorageCacheInvalidator,
  StorageChangeKind
} from "../appStorageSync";
import { APP_STORAGE_KEYS } from "../browserStorage";
import {
  buildQuestionsFromCards,
  EMPTY_STATS,
  extractStats,
  emptyResultsForQuestions,
  isRecord,
  NotebookKind,
  SCHEMA_VERSION,
  type BankSource,
  type InvalidReason,
  type LegacyWrongCardSeed,
  type PracticeNotebook,
  type ProgressCheckpoint,
  type ProgressStats,
  type ProgressStore
} from "./types";

let cachedStore: ProgressStore | null = null;

export function invalidateProgressStoreCache(): void {
  cachedStore = null;
}

function migratedPracticeId(bankId: string): string {
  return `nb-migrated-${bankId}`;
}

function migratedWrongId(bankId: string): string {
  return `nb-migrated-wrong-${bankId}`;
}

function startOfIso(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function isV1ProgressRecord(value: Record<string, unknown>): boolean {
  return Array.isArray(value.results) && !isRecord(value.checkpoint) && !isRecord(value.cards);
}

function normalizeLegacyWrongCards(raw: unknown): LegacyWrongCardSeed[] {
  if (!isRecord(raw)) return [];
  const seeds: LegacyWrongCardSeed[] = [];
  Object.values(raw).forEach((value) => {
    if (!isRecord(value)) return;
    const wrongCount = typeof value.wrongCount === "number" ? value.wrongCount : 0;
    const status = value.status === "mastered" ? "mastered" : "learning";
    if (wrongCount <= 0 || status === "mastered") return;
    seeds.push({
      questionIndex: typeof value.questionIndex === "number" ? value.questionIndex : -1,
      fingerprint: typeof value.fingerprint === "string" ? value.fingerprint : ""
    });
  });
  return seeds;
}

function normalizeV2Checkpoint(raw: Record<string, unknown>): ProgressCheckpoint | null {
  const resultsSource = isRecord(raw.checkpoint) ? raw.checkpoint : raw;
  if (!Array.isArray(resultsSource.results)) return null;
  const stats = isRecord(resultsSource.stats)
    ? ({ ...EMPTY_STATS, ...resultsSource.stats } as ProgressStats)
    : EMPTY_STATS;
  return {
    results: (resultsSource.results as Array<Array<string | undefined>>).map((row) =>
      Array.isArray(row) ? [...row] : []
    ),
    stats: { ...stats },
    updatedAt:
      typeof resultsSource.updatedAt === "string"
        ? resultsSource.updatedAt
        : typeof raw.updatedAt === "string"
          ? raw.updatedAt
          : new Date().toISOString(),
    questions: Array.isArray(resultsSource.questions)
      ? (resultsSource.questions as Question[])
      : Array.isArray(raw.questions)
        ? (raw.questions as Question[])
        : undefined,
    invalidReason: (resultsSource.invalidReason ?? raw.invalidReason) as InvalidReason | undefined
  };
}

function migrateWorkspaceToNotebooks(raw: Record<string, unknown>): PracticeNotebook[] {
  const bankId = typeof raw.bankId === "string" ? raw.bankId : "";
  if (!bankId) return [];

  const now =
    typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const bankSource = (raw.bankSource as BankSource | undefined) ?? "session";
  const name = typeof raw.name === "string" ? raw.name : "未命名题集";
  const type = typeof raw.type === "string" ? raw.type : "";
  const author = typeof raw.author === "string" ? raw.author : "";
  const version = typeof raw.version === "string" ? raw.version : "0.0.2";
  const questionCount = typeof raw.questionCount === "number" ? raw.questionCount : 0;

  const notebooks: PracticeNotebook[] = [];
  const checkpoint = isV1ProgressRecord(raw)
    ? {
        results: (raw.results as Array<Array<string | undefined>>).map((row) =>
          Array.isArray(row) ? [...row] : []
        ),
        stats: isRecord(raw.stats)
          ? ({ ...EMPTY_STATS, ...raw.stats } as ProgressStats)
          : { ...EMPTY_STATS },
        updatedAt: now,
        questions: Array.isArray(raw.questions) ? (raw.questions as Question[]) : undefined,
        invalidReason: raw.invalidReason as InvalidReason | undefined
      }
    : normalizeV2Checkpoint(raw);

  let parentId: string | undefined;
  if (checkpoint) {
    parentId = migratedPracticeId(bankId);
    notebooks.push({
      id: parentId,
      kind: NotebookKind.PRACTICE,
      bankId,
      bankSource,
      name,
      type,
      author,
      version,
      questionCount,
      createdAt: now,
      updatedAt: checkpoint.updatedAt,
      checkpoint
    });
  }

  const legacyWrongCards = normalizeLegacyWrongCards(raw.cards);
  if (legacyWrongCards.length) {
    const sourceQuestions = checkpoint?.questions ?? [];
    const built = sourceQuestions.length
      ? buildQuestionsFromCards(legacyWrongCards, sourceQuestions)
      : [];
    notebooks.push({
      id: migratedWrongId(bankId),
      kind: NotebookKind.WRONG,
      bankId,
      bankSource,
      name: `${name}-错题`,
      type,
      author,
      version,
      parentNotebookId: parentId,
      questionCount: built.length || legacyWrongCards.length,
      createdAt: now,
      updatedAt: now,
      checkpoint: {
        results: built.length ? emptyResultsForQuestions(built) : [],
        stats: built.length
          ? extractStats(createProgressSnapshot(built))
          : { ...EMPTY_STATS },
        updatedAt: now,
        questions: built.length ? built : undefined
      },
      legacyWrongCards: built.length ? undefined : legacyWrongCards
    });
  }

  return notebooks;
}

export function normalizeNotebook(raw: Record<string, unknown>, fallbackId: string): PracticeNotebook | null {
  const id = typeof raw.id === "string" && raw.id ? raw.id : fallbackId;
  const bankId = typeof raw.bankId === "string" ? raw.bankId : "";
  if (!id || !bankId) return null;
  if (!isRecord(raw.checkpoint) || !Array.isArray(raw.checkpoint.results)) return null;

  const stats = isRecord(raw.checkpoint.stats)
    ? ({ ...EMPTY_STATS, ...raw.checkpoint.stats } as ProgressStats)
    : EMPTY_STATS;
  const createdAt = startOfIso(
    typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
  );

  return {
    id,
    kind: raw.kind === NotebookKind.WRONG ? NotebookKind.WRONG : NotebookKind.PRACTICE,
    bankId,
    bankSource: (raw.bankSource as BankSource | undefined) ?? "session",
    name: typeof raw.name === "string" ? raw.name : "未命名题集",
    type: typeof raw.type === "string" ? raw.type : "",
    author: typeof raw.author === "string" ? raw.author : "",
    version: typeof raw.version === "string" ? raw.version : "0.0.2",
    parentNotebookId: typeof raw.parentNotebookId === "string" ? raw.parentNotebookId : undefined,
    questionCount: typeof raw.questionCount === "number" ? raw.questionCount : 0,
    createdAt,
    updatedAt: startOfIso(
      typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
      createdAt
    ),
    checkpoint: {
      results: (raw.checkpoint.results as Array<Array<string | undefined>>).map((row) =>
        Array.isArray(row) ? [...row] : []
      ),
      stats: { ...stats },
      updatedAt:
        typeof raw.checkpoint.updatedAt === "string" ? raw.checkpoint.updatedAt : createdAt,
      questions: Array.isArray(raw.checkpoint.questions)
        ? (raw.checkpoint.questions as Question[])
        : undefined,
      invalidReason: raw.checkpoint.invalidReason as InvalidReason | undefined
    },
    legacyWrongCards: Array.isArray(raw.legacyWrongCards)
      ? (raw.legacyWrongCards as LegacyWrongCardSeed[])
      : undefined
  };
}

function parseStoreFromRaw(raw: string | null): ProgressStore {
  if (!raw) return { schemaVersion: SCHEMA_VERSION, notebooks: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { schemaVersion: SCHEMA_VERSION, notebooks: {} };

    const notebooks: Record<string, PracticeNotebook> = {};

    if (isRecord(parsed.notebooks)) {
      Object.entries(parsed.notebooks).forEach(([id, value]) => {
        if (!isRecord(value)) return;
        const notebook = normalizeNotebook({ ...value, id: value.id ?? id }, id);
        if (notebook) notebooks[notebook.id] = notebook;
      });
      return { schemaVersion: SCHEMA_VERSION, notebooks };
    }

    if (isRecord(parsed.workspaces)) {
      Object.entries(parsed.workspaces).forEach(([id, value]) => {
        if (!isRecord(value)) return;
        migrateWorkspaceToNotebooks({ ...value, bankId: value.bankId ?? id }).forEach((notebook) => {
          notebooks[notebook.id] = notebook;
        });
      });
      return { schemaVersion: SCHEMA_VERSION, notebooks };
    }

    const legacyRecords = isRecord(parsed.records)
      ? parsed.records
      : !("records" in parsed) && !("workspaces" in parsed) && !("notebooks" in parsed)
        ? parsed
        : null;

    if (legacyRecords && isRecord(legacyRecords)) {
      Object.entries(legacyRecords).forEach(([id, value]) => {
        if (!isRecord(value)) return;
        migrateWorkspaceToNotebooks({ ...value, bankId: value.bankId ?? id }).forEach((notebook) => {
          notebooks[notebook.id] = notebook;
        });
      });
    }

    return { schemaVersion: SCHEMA_VERSION, notebooks };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, notebooks: {} };
  }
}

export function readStore(): ProgressStore {
  if (typeof window === "undefined") {
    return { schemaVersion: SCHEMA_VERSION, notebooks: {} };
  }
  if (cachedStore) return cachedStore;
  const store = parseStoreFromRaw(window.localStorage.getItem(APP_STORAGE_KEYS.practiceProgress));
  cachedStore = store;
  return store;
}

export function writeStore(notebooks: Record<string, PracticeNotebook>): void {
  if (typeof window === "undefined") return;
  const nextStore: ProgressStore = { schemaVersion: SCHEMA_VERSION, notebooks };
  window.localStorage.setItem(APP_STORAGE_KEYS.practiceProgress, JSON.stringify(nextStore));
  cachedStore = nextStore;
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

/** 供测试重置 storage */
export function __clearAllProgressForTests(): void {
  invalidateProgressStoreCache();
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APP_STORAGE_KEYS.practiceProgress);
}

/** 供测试直接写入原始 JSON（含 v1/v2） */
export function __writeRawProgressForTests(raw: string): void {
  invalidateProgressStoreCache();
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_STORAGE_KEYS.practiceProgress, raw);
}

registerStorageCacheInvalidator(StorageChangeKind.practiceProgress, invalidateProgressStoreCache);
