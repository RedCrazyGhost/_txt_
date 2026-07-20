import md5 from "js-md5";
import type { Question } from "../models/question/types";
import { createProgressSnapshot } from "../models/question/progress";
import type { ProgressAggregates } from "../models/question/progress";
import {
  notifyStorageChanged,
  registerStorageCacheInvalidator,
  StorageChangeKind
} from "./appStorageSync";

const PROGRESS_KEY = "_txt_practice_progress";
const SCHEMA_VERSION = 1;

export const ProgressFilter = {
  ALL: "all",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INVALID: "invalid"
} as const;

export type ProgressFilter = (typeof ProgressFilter)[keyof typeof ProgressFilter];

export const ProgressStatus = {
  NOT_STARTED: "notStarted",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INVALID: "invalid"
} as const;

export type ProgressStatus = (typeof ProgressStatus)[keyof typeof ProgressStatus];

export type BankSource = "local" | "remote" | "session";

export type InvalidReason = "bankMissing" | "questionCountMismatch" | "sessionQuestionsMissing";

export interface ProgressStats extends ProgressAggregates {}

export interface ProgressRecordMeta {
  bankId: string;
  bankSource?: BankSource;
  name?: string;
  type?: string;
  author?: string;
  version?: string;
}

/** Meta used to build session bank ids (bankId not yet known). */
export type SessionBankMetaInput = Omit<ProgressRecordMeta, "bankId"> & { bankId?: string };

export interface ProgressRecord extends ProgressRecordMeta {
  questionCount: number;
  updatedAt: string;
  results: Array<Array<string | undefined>>;
  stats: ProgressStats;
  questions?: Question[];
  invalidReason?: InvalidReason;
}

export interface ProgressStore {
  schemaVersion: number;
  records: Record<string, ProgressRecord>;
}

export interface BuildProgressRecordOptions {
  includeQuestionsSnapshot?: boolean;
}

export interface ListProgressOptions {
  filter?: ProgressFilter;
  sort?: "updatedAtDesc";
}

export interface EnrichedProgressRecord extends ProgressRecord {
  status: ProgressStatus;
}

export interface ProgressStatusCounts {
  all: number;
  inProgress: number;
  completed: number;
  invalid: number;
  notStarted: number;
}

export interface BankLike {
  id: string;
  questions?: Question[] | string[][];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

let cachedStore: ProgressStore | null = null;

export function invalidateProgressStoreCache(): void {
  cachedStore = null;
}

function parseStoreFromRaw(raw: string | null): ProgressStore {
  if (!raw) return { schemaVersion: SCHEMA_VERSION, records: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && isRecord(parsed.records)) {
      return parsed as unknown as ProgressStore;
    }
    if (isRecord(parsed) && !("records" in parsed)) {
      return { schemaVersion: SCHEMA_VERSION, records: parsed as Record<string, ProgressRecord> };
    }
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  }
}

function readStore(): ProgressStore {
  if (typeof window === "undefined") {
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  }
  if (cachedStore) return cachedStore;
  const store = parseStoreFromRaw(window.localStorage.getItem(PROGRESS_KEY));
  cachedStore = store;
  return store;
}

function writeStore(records: Record<string, ProgressRecord>): void {
  if (typeof window === "undefined") return;
  const nextStore: ProgressStore = { schemaVersion: SCHEMA_VERSION, records };
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextStore));
  cachedStore = nextStore;
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

function cloneQuestionsSnapshot(questions: Question[]): Question[] {
  return JSON.parse(JSON.stringify(questions ?? [])) as Question[];
}

function questionFingerprint(question: unknown): string {
  if (!question || typeof question !== "object") return "";
  const q = question as Record<string, unknown>;
  if (Array.isArray(q.texts)) return q.texts.join("");
  if (typeof q.stem === "string") return q.stem;
  return JSON.stringify(question);
}

export function buildSessionBankId(meta: SessionBankMetaInput, questions: Question[]): string {
  const payload = JSON.stringify({
    name: meta?.name ?? "",
    type: meta?.type ?? "",
    author: meta?.author ?? "",
    version: meta?.version ?? "",
    count: Array.isArray(questions) ? questions.length : 0,
    fingerprint: (questions ?? []).slice(0, 3).map(questionFingerprint)
  });
  return `session-${md5(payload)}`;
}

function cloneResults(questions: Question[]): Array<Array<string | undefined>> {
  return (questions ?? []).map((question) =>
    Array.isArray(question?.results) ? [...question.results] : []
  );
}

function extractStats(snapshot: ProgressAggregates): ProgressStats {
  return {
    totalQuestions: snapshot.totalQuestions,
    attemptedQuestions: snapshot.attemptedQuestions,
    fullyCorrectQuestions: snapshot.fullyCorrectQuestions,
    totalSlots: snapshot.totalSlots,
    attemptedSlots: snapshot.attemptedSlots,
    correctSlots: snapshot.correctSlots,
    partialSlots: snapshot.partialSlots,
    wrongSlots: snapshot.wrongSlots,
    unansweredSlots: snapshot.unansweredSlots
  };
}

export function buildProgressRecord(
  meta: ProgressRecordMeta,
  questions: Question[],
  options: BuildProgressRecordOptions = {}
): ProgressRecord {
  const { includeQuestionsSnapshot = false } = options;
  const snapshot = createProgressSnapshot(questions ?? []);
  const record: ProgressRecord = {
    bankId: meta.bankId,
    bankSource: meta.bankSource ?? "session",
    name: meta.name ?? "未命名题集",
    type: meta.type ?? "",
    author: meta.author ?? "",
    version: meta.version ?? "0.0.2",
    questionCount: (questions ?? []).length,
    updatedAt: new Date().toISOString(),
    results: cloneResults(questions),
    stats: extractStats(snapshot)
  };

  if (includeQuestionsSnapshot) {
    record.questions = cloneQuestionsSnapshot(questions ?? []);
  }

  return record;
}

export function getProgressRecord(bankId: string): ProgressRecord | null {
  if (!bankId) return null;
  return readStore().records[bankId] ?? null;
}

export function saveProgressRecord(record: ProgressRecord): void {
  if (!record?.bankId) return;
  const store = readStore();
  const previous = store.records[record.bankId];
  const next: ProgressRecord = {
    ...record,
    updatedAt: new Date().toISOString()
  };

  if (
    !Array.isArray(next.questions) &&
    Array.isArray(previous?.questions) &&
    previous.questions.length > 0
  ) {
    next.questions = previous.questions;
  }

  store.records[record.bankId] = next;
  writeStore(store.records);
}

export function removeProgressRecord(bankId: string): void {
  if (!bankId) return;
  const store = readStore();
  delete store.records[bankId];
  writeStore(store.records);
}

export function applyProgressToQuestions(questions: Question[], record: ProgressRecord): boolean {
  if (!record || !Array.isArray(questions)) return false;
  if (record.questionCount !== questions.length) return false;
  if (!Array.isArray(record.results)) return false;

  record.results.forEach((row, index) => {
    if (!questions[index] || !Array.isArray(row)) return;
    questions[index].results = [...row];
  });
  return true;
}

export function deriveStatus(record: ProgressRecord | null | undefined): ProgressStatus {
  if (record?.invalidReason) return ProgressStatus.INVALID;

  const { attemptedSlots = 0, unansweredSlots = 0, totalSlots = 0 } = record?.stats ?? {};
  if (attemptedSlots === 0) return ProgressStatus.NOT_STARTED;
  if (totalSlots > 0 && unansweredSlots === 0) return ProgressStatus.COMPLETED;
  if (attemptedSlots > 0 && unansweredSlots > 0) return ProgressStatus.IN_PROGRESS;
  return ProgressStatus.NOT_STARTED;
}

export function enrichWithValidity(
  record: ProgressRecord | null | undefined,
  banks: BankLike[] = []
): ProgressRecord | null | undefined {
  if (!record) return record;
  if (record.bankSource === "session") {
    if (!Array.isArray(record.questions) || record.questions.length !== record.questionCount) {
      return { ...record, invalidReason: "sessionQuestionsMissing" };
    }
    return { ...record, invalidReason: undefined };
  }

  const bank = banks.find((item) => item.id === record.bankId);
  if (!bank) {
    return { ...record, invalidReason: "bankMissing" };
  }

  const questionCount = Array.isArray(bank.questions) ? bank.questions.length : 0;
  if (questionCount !== record.questionCount) {
    return { ...record, invalidReason: "questionCountMismatch" };
  }

  return { ...record, invalidReason: undefined };
}

function mapRecord(record: ProgressRecord, banks: BankLike[]): EnrichedProgressRecord {
  const enriched = enrichWithValidity(record, banks) as ProgressRecord;
  return {
    ...enriched,
    status: deriveStatus(enriched)
  };
}

export function listProgressRecords(
  options: ListProgressOptions = {},
  banks: BankLike[] = []
): EnrichedProgressRecord[] {
  const { filter = ProgressFilter.ALL, sort = "updatedAtDesc" } = options;
  let records = Object.values(readStore().records).map((record) => mapRecord(record, banks));

  if (filter !== ProgressFilter.ALL) {
    records = records.filter((record) => record.status === filter);
  }

  if (sort === "updatedAtDesc") {
    records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return records;
}

export function countByStatus(records: EnrichedProgressRecord[]): ProgressStatusCounts {
  const counts: ProgressStatusCounts = {
    all: 0,
    inProgress: 0,
    completed: 0,
    invalid: 0,
    notStarted: 0
  };

  records.forEach((record) => {
    counts.all += 1;
    if (counts[record.status as keyof ProgressStatusCounts] !== undefined) {
      counts[record.status as keyof ProgressStatusCounts] += 1;
    }
  });

  return counts;
}

export function listIncompleteRecords(banks: BankLike[] = []): EnrichedProgressRecord[] {
  return listProgressRecords({ filter: ProgressFilter.IN_PROGRESS }, banks);
}

export function getInvalidReasonLabel(reason: InvalidReason | string | undefined): string {
  switch (reason) {
    case "bankMissing":
      return "原题库已不存在";
    case "questionCountMismatch":
      return "题库题目数量已变更";
    case "sessionQuestionsMissing":
      return "会话题目快照缺失";
    default:
      return "记录已失效";
  }
}

export function getBankSourceLabel(source: BankSource | string | undefined): string {
  switch (source) {
    case "local":
      return "本地题库";
    case "remote":
      return "远程题库";
    case "session":
      return "首页会话";
    default:
      return "未知来源";
  }
}

/** 供测试重置 storage */
export function __clearAllProgressForTests(): void {
  invalidateProgressStoreCache();
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_KEY);
}

registerStorageCacheInvalidator(StorageChangeKind.practiceProgress, invalidateProgressStoreCache);
