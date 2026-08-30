import md5 from "js-md5";
import type { Question } from "../../models/question/types";
import { createProgressSnapshot } from "../../models/question/progress";
import type { ProgressAggregates } from "../../models/question/progress";
import { cloneQuestionWithEmptyResults } from "../../models/question/wrongQuestions";
import { getAnswerSlotCount } from "../../utils/questions";

export const SCHEMA_VERSION = 3;

export const PracticeMode = {
  RESUME: "resume",
  WRONG: "wrong"
} as const;

export type PracticeMode = (typeof PracticeMode)[keyof typeof PracticeMode];

export const NotebookKind = {
  PRACTICE: "practice",
  WRONG: "wrong"
} as const;

export type NotebookKind = (typeof NotebookKind)[keyof typeof NotebookKind];

export const ProgressFilter = {
  ALL: "all",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INVALID: "invalid"
} as const;

export type ProgressFilter = (typeof ProgressFilter)[keyof typeof ProgressFilter];

export const NotebookFilter = {
  ALL: "all",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  HAS_WRONG: "hasWrong",
  INVALID: "invalid"
} as const;

export type NotebookFilter = (typeof NotebookFilter)[keyof typeof NotebookFilter];

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
  notebookId?: string;
  bankId: string;
  bankSource?: BankSource;
  name?: string;
  type?: string;
  author?: string;
  version?: string;
  kind?: NotebookKind;
  parentNotebookId?: string;
}

/** Meta used to build session bank ids (bankId not yet known). */
export type SessionBankMetaInput = Omit<ProgressRecordMeta, "bankId"> & { bankId?: string };

export interface ProgressCheckpoint {
  results: Array<Array<string | undefined>>;
  stats: ProgressStats;
  updatedAt: string;
  questions?: Question[];
  invalidReason?: InvalidReason;
}

export interface LegacyWrongCardSeed {
  questionIndex: number;
  fingerprint: string;
}

export interface PracticeNotebook extends ProgressRecordMeta {
  id: string;
  kind: NotebookKind;
  bankId: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  checkpoint: ProgressCheckpoint;
  /** v2 迁移残留，hydrate 后清除 */
  legacyWrongCards?: LegacyWrongCardSeed[];
}

/** Flattened checkpoint view for resume / persistence. */
export interface ProgressRecord extends ProgressRecordMeta {
  notebookId: string;
  questionCount: number;
  updatedAt: string;
  results: Array<Array<string | undefined>>;
  stats: ProgressStats;
  questions?: Question[];
  invalidReason?: InvalidReason;
}

export interface ProgressStore {
  schemaVersion: number;
  notebooks: Record<string, PracticeNotebook>;
}

export interface BuildProgressRecordOptions {
  includeQuestionsSnapshot?: boolean;
}

export interface ListProgressOptions {
  filter?: ProgressFilter;
  sort?: "updatedAtDesc";
}

export interface ListNotebookOptions {
  filter?: NotebookFilter;
  sort?: "updatedAtDesc";
}

export interface EnrichedProgressRecord extends ProgressRecord {
  status: ProgressStatus;
}

export interface EnrichedNotebook extends PracticeNotebook {
  status: ProgressStatus;
  wrongQuestionCount: number;
  /** 严格错题 + 半对，供「含半对」生成错题本按钮启用态 */
  wrongWithPartialCount: number;
  children: EnrichedNotebook[];
}

export interface BankNotebookGroup {
  groupKey: string;
  bankId: string;
  bankIds: string[];
  bankSource?: BankSource;
  sources: BankSource[];
  name: string;
  type: string;
  author: string;
  notebooks: EnrichedNotebook[];
  orphanWrongNotebooks: EnrichedNotebook[];
}

export interface ProgressStatusCounts {
  all: number;
  inProgress: number;
  completed: number;
  invalid: number;
  notStarted: number;
}

export interface NotebookFilterCounts {
  all: number;
  inProgress: number;
  completed: number;
  hasWrong: number;
  invalid: number;
}

export interface BankLike {
  id: string;
  questions?: Question[] | string[][] | unknown[];
}

export interface CreateWrongNotebookOptions {
  includePartial?: boolean;
  banks?: BankLike[];
  sourceQuestions?: Question[];
}

export const EMPTY_STATS: ProgressStats = {
  totalQuestions: 0,
  attemptedQuestions: 0,
  fullyCorrectQuestions: 0,
  totalSlots: 0,
  attemptedSlots: 0,
  correctSlots: 0,
  partialSlots: 0,
  wrongSlots: 0,
  unansweredSlots: 0
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isResumePracticeMode(mode: string | undefined | null): boolean {
  return !mode || mode === PracticeMode.RESUME;
}

export function questionFingerprint(question: unknown): string {
  if (!question || typeof question !== "object") return "";
  const q = question as Record<string, unknown>;
  if (Array.isArray(q.texts)) return q.texts.join("");
  if (typeof q.stem === "string") return q.stem;
  return JSON.stringify(question);
}

export function createNotebookId(): string {
  return `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

export function cloneQuestionsSnapshot(questions: Question[]): Question[] {
  return JSON.parse(JSON.stringify(questions ?? [])) as Question[];
}

export function cloneResults(questions: Question[]): Array<Array<string | undefined>> {
  return (questions ?? []).map((question) =>
    Array.isArray(question?.results) ? [...question.results] : []
  );
}

export function emptyResultsForQuestions(questions: Question[]): Array<Array<string | undefined>> {
  return (questions ?? []).map((question) =>
    Array.from({ length: getAnswerSlotCount(question) }, () => undefined)
  );
}

export function extractStats(snapshot: ProgressAggregates): ProgressStats {
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

export function cloneCheckpoint(checkpoint: ProgressCheckpoint): ProgressCheckpoint {
  return {
    results: checkpoint.results.map((row) => (Array.isArray(row) ? [...row] : [])),
    stats: { ...checkpoint.stats },
    updatedAt: checkpoint.updatedAt,
    questions: checkpoint.questions,
    invalidReason: checkpoint.invalidReason
  };
}

export function notebookToProgressRecord(notebook: PracticeNotebook): ProgressRecord {
  return {
    notebookId: notebook.id,
    bankId: notebook.bankId,
    bankSource: notebook.bankSource,
    name: notebook.name,
    type: notebook.type,
    author: notebook.author,
    version: notebook.version,
    kind: notebook.kind,
    parentNotebookId: notebook.parentNotebookId,
    questionCount: notebook.questionCount,
    updatedAt: notebook.checkpoint.updatedAt,
    results: notebook.checkpoint.results.map((row) => [...row]),
    stats: { ...notebook.checkpoint.stats },
    questions: notebook.checkpoint.questions,
    invalidReason: notebook.checkpoint.invalidReason
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
    notebookId: meta.notebookId || createNotebookId(),
    bankId: meta.bankId,
    bankSource: meta.bankSource ?? "session",
    name: meta.name ?? "未命名题集",
    type: meta.type ?? "",
    author: meta.author ?? "",
    version: meta.version ?? "0.0.2",
    kind: meta.kind ?? NotebookKind.PRACTICE,
    parentNotebookId: meta.parentNotebookId,
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

export function shouldSnapshotQuestions(_notebook: Pick<PracticeNotebook, "kind" | "bankSource">): boolean {
  return true;
}

export function hasQuestionSnapshot(record: Pick<ProgressRecord, "questions" | "questionCount">): boolean {
  return (
    Array.isArray(record.questions) &&
    record.questions.length > 0 &&
    record.questions.length === record.questionCount
  );
}

export function hasQuestionSnapshotForRecord(record: Pick<ProgressRecord, "questions" | "questionCount">): boolean {
  return hasQuestionSnapshot(record);
}

export function recordToNotebook(record: ProgressRecord, previous?: PracticeNotebook | null): PracticeNotebook {
  const now = record.updatedAt || new Date().toISOString();
  let questions = record.questions;
  if (
    !Array.isArray(questions) &&
    Array.isArray(previous?.checkpoint.questions) &&
    previous.checkpoint.questions.length > 0
  ) {
    questions = previous.checkpoint.questions;
  }

  return {
    id: record.notebookId,
    kind: record.kind ?? previous?.kind ?? NotebookKind.PRACTICE,
    bankId: record.bankId,
    bankSource: record.bankSource ?? previous?.bankSource ?? "session",
    name: record.name ?? previous?.name ?? "未命名题集",
    type: record.type ?? previous?.type ?? "",
    author: record.author ?? previous?.author ?? "",
    version: record.version ?? previous?.version ?? "0.0.2",
    parentNotebookId: record.parentNotebookId ?? previous?.parentNotebookId,
    questionCount: record.questionCount,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    checkpoint: {
      results: record.results.map((row) => (Array.isArray(row) ? [...row] : [])),
      stats: { ...record.stats },
      updatedAt: now,
      questions,
      invalidReason: record.invalidReason
    },
    legacyWrongCards: previous?.legacyWrongCards
  };
}

export function buildQuestionsFromCards(
  cards: LegacyWrongCardSeed[],
  sourceQuestions: Question[]
): Question[] {
  if (!cards.length || !sourceQuestions.length) return [];

  const byFingerprint = new Map<string, Question>();
  sourceQuestions.forEach((question) => {
    const fp = questionFingerprint(question);
    if (fp && !byFingerprint.has(fp)) byFingerprint.set(fp, question);
  });

  const built: Question[] = [];
  cards.forEach((card) => {
    let question =
      card.questionIndex >= 0 && card.questionIndex < sourceQuestions.length
        ? sourceQuestions[card.questionIndex]
        : undefined;

    if (!question || questionFingerprint(question) !== card.fingerprint) {
      question = byFingerprint.get(card.fingerprint);
    }
    if (!question) return;
    built.push(cloneQuestionWithEmptyResults(question));
  });

  return built;
}
