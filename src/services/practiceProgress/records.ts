import type { Question } from "../../models/question/types";
import { createProgressSnapshot } from "../../models/question/progress";
import { stripWrongBankSuffix } from "../../models/question/wrongQuestions";
import {
  buildWrongQuestionsSet,
  cloneQuestionWithEmptyResults,
  getStrictWrongQuestions,
  getWrongQuestionsIncludingPartial
} from "../../models/question/wrongQuestions";
import {
  buildProgressRecord,
  buildQuestionsFromCards,
  cloneCheckpoint,
  cloneQuestionsSnapshot,
  createNotebookId,
  emptyResultsForQuestions,
  extractStats,
  hasQuestionSnapshot,
  NotebookKind,
  notebookToProgressRecord,
  ProgressStatus,
  recordToNotebook,
  shouldSnapshotQuestions,
  type BankLike,
  type BuildProgressRecordOptions,
  type CreateWrongNotebookOptions,
  type EnrichedNotebook,
  type EnrichedProgressRecord,
  type PracticeNotebook,
  type ProgressRecord,
  type ProgressRecordMeta,
  type ProgressStats
} from "./types";
import { readStore, writeStore } from "./store";

export function notebookGroupKey(name: string | undefined): string {
  return stripWrongBankSuffix(name).trim() || "未命名题集";
}

export function getNotebook(notebookId: string): PracticeNotebook | null {
  if (!notebookId) return null;
  return readStore().notebooks[notebookId] ?? null;
}

export function getProgressRecord(notebookId: string): ProgressRecord | null {
  const notebook = getNotebook(notebookId);
  if (!notebook) return null;
  return notebookToProgressRecord(notebook);
}

export function listNotebooksByBankId(bankId: string): PracticeNotebook[] {
  if (!bankId) return [];
  return Object.values(readStore().notebooks)
    .filter((notebook) => notebook.bankId === bankId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function saveProgressRecord(record: ProgressRecord): void {
  if (!record?.notebookId || !record.bankId) return;
  const store = readStore();
  const previous = store.notebooks[record.notebookId];
  const notebook = recordToNotebook(record, previous);
  store.notebooks[notebook.id] = notebook;
  writeStore(store.notebooks);
}

export function saveNotebook(notebook: PracticeNotebook): void {
  if (!notebook?.id) return;
  const store = readStore();
  store.notebooks[notebook.id] = {
    ...notebook,
    checkpoint: cloneCheckpoint(notebook.checkpoint)
  };
  writeStore(store.notebooks);
}

export function createPracticeNotebook(
  meta: ProgressRecordMeta,
  questions: Question[],
  options: BuildProgressRecordOptions & { emptyResults?: boolean } = {}
): PracticeNotebook {
  const source = options.emptyResults
    ? (questions ?? []).map((question) => cloneQuestionWithEmptyResults(question))
    : questions;
  const includeQuestionsSnapshot =
    options.includeQuestionsSnapshot ??
    shouldSnapshotQuestions({
      kind: meta.kind ?? NotebookKind.PRACTICE,
      bankSource: meta.bankSource ?? "session"
    });
  const record = buildProgressRecord(
    {
      ...meta,
      notebookId: meta.notebookId || createNotebookId(),
      kind: meta.kind ?? NotebookKind.PRACTICE
    },
    source,
    { includeQuestionsSnapshot }
  );
  saveProgressRecord(record);
  return getNotebook(record.notebookId)!;
}

export interface PatchProgressRecordInput extends ProgressRecordMeta {
  notebookId: string;
  questionIndex: number;
  question: Question;
  questionCount: number;
  stats: ProgressStats;
}

export function patchProgressRecord(input: PatchProgressRecordInput): boolean {
  if (!input?.notebookId || input.questionIndex < 0) return false;

  const store = readStore();
  const previous = store.notebooks[input.notebookId];
  if (!previous?.checkpoint) return false;

  const results = Array.isArray(previous.checkpoint.results)
    ? previous.checkpoint.results.map((row) => (Array.isArray(row) ? [...row] : []))
    : [];

  while (results.length < input.questionCount) {
    results.push([]);
  }

  results[input.questionIndex] = Array.isArray(input.question.results)
    ? [...input.question.results]
    : [];

  const now = new Date().toISOString();
  const notebook: PracticeNotebook = {
    ...previous,
    bankId: input.bankId || previous.bankId,
    bankSource: input.bankSource ?? previous.bankSource ?? "session",
    name: input.name ?? previous.name ?? "未命名题集",
    type: input.type ?? previous.type ?? "",
    author: input.author ?? previous.author ?? "",
    version: input.version ?? previous.version ?? "0.0.2",
    questionCount: input.questionCount,
    updatedAt: now,
    checkpoint: {
      results,
      stats: { ...input.stats },
      updatedAt: now,
      questions: previous.checkpoint.questions,
      invalidReason: previous.checkpoint.invalidReason
    }
  };

  store.notebooks[input.notebookId] = notebook;
  writeStore(store.notebooks);
  return true;
}

export function removeProgressRecord(notebookId: string): void {
  if (!notebookId) return;
  const store = readStore();
  delete store.notebooks[notebookId];
  writeStore(store.notebooks);
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
  if (record.kind === NotebookKind.WRONG || record.bankSource === "session") {
    if (!Array.isArray(record.questions) || record.questions.length !== record.questionCount) {
      return { ...record, invalidReason: "sessionQuestionsMissing" };
    }
    return { ...record, invalidReason: undefined };
  }

  const bank = banks.find((item) => item.id === record.bankId);
  if (!bank) {
    if (hasQuestionSnapshot(record)) {
      return { ...record, invalidReason: undefined };
    }
    return { ...record, invalidReason: "bankMissing" };
  }

  const questionCount = Array.isArray(bank.questions) ? bank.questions.length : 0;
  if (questionCount !== record.questionCount) {
    if (hasQuestionSnapshot(record)) {
      return { ...record, invalidReason: undefined };
    }
    return { ...record, invalidReason: "questionCountMismatch" };
  }

  return { ...record, invalidReason: undefined };
}

export function resolveSourceQuestions(
  notebook: PracticeNotebook,
  banks: BankLike[] = []
): Question[] {
  if (Array.isArray(notebook.checkpoint.questions) && notebook.checkpoint.questions.length) {
    return cloneQuestionsSnapshot(notebook.checkpoint.questions);
  }
  if (notebook.kind === NotebookKind.WRONG || notebook.bankSource === "session") {
    return [];
  }
  const bank = banks.find((item) => item.id === notebook.bankId);
  if (!bank || !Array.isArray(bank.questions)) return [];
  return cloneQuestionsSnapshot(bank.questions as Question[]);
}

function hydrateLegacyWrongNotebook(
  notebook: PracticeNotebook,
  banks: BankLike[],
  persist: boolean
): PracticeNotebook {
  if (!notebook.legacyWrongCards?.length) return notebook;
  if (notebook.checkpoint.questions?.length) {
    const next = { ...notebook, legacyWrongCards: undefined };
    if (persist) saveNotebook(next);
    return next;
  }

  let source: Question[] = [];
  if (notebook.parentNotebookId) {
    const parent = getNotebook(notebook.parentNotebookId);
    if (parent) source = resolveSourceQuestions(parent, banks);
  }
  if (!source.length) {
    const bank = banks.find((item) => item.id === notebook.bankId);
    if (bank && Array.isArray(bank.questions)) {
      source = bank.questions as Question[];
    }
  }

  const built = buildQuestionsFromCards(notebook.legacyWrongCards, source);
  if (!built.length) return notebook;

  const next: PracticeNotebook = {
    ...notebook,
    questionCount: built.length,
    legacyWrongCards: undefined,
    checkpoint: {
      ...notebook.checkpoint,
      questions: built,
      results: emptyResultsForQuestions(built),
      stats: extractStats(createProgressSnapshot(built))
    }
  };
  if (persist) saveNotebook(next);
  return next;
}

function questionsWithAppliedProgress(notebook: PracticeNotebook, banks: BankLike[]): Question[] {
  const questions = resolveSourceQuestions(notebook, banks);
  if (!questions.length) return [];
  applyProgressToQuestions(questions, notebookToProgressRecord(notebook));
  return questions;
}

export function countWrongQuestionsInNotebook(
  notebook: PracticeNotebook,
  banks: BankLike[] = [],
  includePartial = false
): number {
  const questions = questionsWithAppliedProgress(notebook, banks);
  if (!questions.length) return 0;
  return includePartial
    ? getWrongQuestionsIncludingPartial(questions).length
    : getStrictWrongQuestions(questions).length;
}

function resolvePracticeRootId(parent: PracticeNotebook): string {
  if (parent.kind === NotebookKind.PRACTICE) return parent.id;

  let currentId: string | undefined = parent.parentNotebookId;
  const seen = new Set<string>([parent.id]);

  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const current = getNotebook(currentId);
    if (!current) break;
    if (current.kind === NotebookKind.PRACTICE) return current.id;
    currentId = current.parentNotebookId;
  }

  return parent.parentNotebookId ?? parent.id;
}

export function createWrongNotebook(
  parent: PracticeNotebook,
  options: CreateWrongNotebookOptions = {}
): PracticeNotebook | null {
  const { includePartial = false, banks = [], sourceQuestions } = options;
  const applied = sourceQuestions?.length
    ? cloneQuestionsSnapshot(sourceQuestions)
    : questionsWithAppliedProgress(parent, banks);
  if (!applied.length) return null;

  const wrongSet = buildWrongQuestionsSet(
    {
      name: parent.name,
      type: parent.type,
      author: parent.author,
      version: parent.version
    },
    applied,
    { includePartial, clearResults: true }
  );
  if (!wrongSet.questions.length) return null;

  return createPracticeNotebook(
    {
      bankId: parent.bankId,
      bankSource: parent.bankSource ?? "session",
      name: wrongSet.name,
      type: wrongSet.type,
      author: wrongSet.author,
      version: wrongSet.version,
      kind: NotebookKind.WRONG,
      parentNotebookId: resolvePracticeRootId(parent)
    },
    wrongSet.questions,
    { includeQuestionsSnapshot: true }
  );
}

export function mapRecord(record: ProgressRecord, banks: BankLike[]): EnrichedProgressRecord {
  const enriched = enrichWithValidity(record, banks) as ProgressRecord;
  return {
    ...enriched,
    status: deriveStatus(enriched)
  };
}

export function enrichNotebook(notebook: PracticeNotebook, banks: BankLike[]): EnrichedNotebook {
  const hydrated = hydrateLegacyWrongNotebook(notebook, banks, true);
  const record = mapRecord(notebookToProgressRecord(hydrated), banks);
  const forCount = {
    ...hydrated,
    checkpoint: {
      ...hydrated.checkpoint,
      invalidReason: undefined
    }
  };
  return {
    ...hydrated,
    checkpoint: {
      ...hydrated.checkpoint,
      invalidReason: record.invalidReason
    },
    status: record.invalidReason ? ProgressStatus.INVALID : record.status,
    wrongQuestionCount: countWrongQuestionsInNotebook(forCount, banks, false),
    wrongWithPartialCount: countWrongQuestionsInNotebook(forCount, banks, true),
    children: []
  };
}

export { hydrateLegacyWrongNotebook };
