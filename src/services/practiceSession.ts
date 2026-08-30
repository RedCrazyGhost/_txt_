import type { Router } from "vue-router";
import { resetQuestionProgress } from "../models/question/progress";
import type { Question } from "../models/question/types";
import { appState } from "../state/appState";
import { normalizeQuestionWithDetection, resolveQuestionBankVersion } from "../utils/questions";
import {
  NotebookKind,
  PracticeMode,
  ProgressStatus,
  applyProgressToQuestions,
  createPracticeNotebook,
  listIncompletePracticeNotebooks,
  notebookToProgressRecord,
  resolveSourceQuestions,
  type BankLike,
  type EnrichedNotebook,
  type PracticeNotebook
} from "./practiceProgress";

export interface PracticeBankInput {
  id: string;
  source?: string;
  title?: string;
  name?: string;
  subject?: string;
  type?: string;
  author?: string;
  questions?: Question[] | string[][] | unknown[];
}

export interface BankLookupItem {
  id: string;
  questions?: Question[] | string[][] | unknown[];
}

export interface IncompletePracticeChoice {
  latest: EnrichedNotebook;
  incompleteCount: number;
}

function normalizeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((question) => normalizeQuestionWithDetection(question));
}

function assignPracticeSession(
  notebook: PracticeNotebook,
  questions: Question[],
  mode: typeof PracticeMode.RESUME | typeof PracticeMode.WRONG
): void {
  appState.questionsJSON = {
    notebookId: notebook.id,
    bankId: notebook.bankId,
    bankSource: notebook.bankSource ?? "",
    version: resolveQuestionBankVersion(questions),
    name: notebook.name ?? "",
    type: notebook.type ?? "",
    author: notebook.author ?? "",
    questions,
    practiceMode: mode
  };
  resetQuestionProgress(questions);
}

export function inspectIncompletePractice(
  bankId: string,
  banks: BankLike[] = []
): IncompletePracticeChoice | null {
  const incomplete = listIncompletePracticeNotebooks(bankId, banks);
  if (!incomplete.length) return null;
  return {
    latest: incomplete[0]!,
    incompleteCount: incomplete.length
  };
}

export function startNewPracticeFromBank(bank: PracticeBankInput, router: Router): boolean {
  const questions = normalizeQuestions(bank.questions);
  if (!questions.length) return false;

  const bankSource = (bank.source || "local") as PracticeNotebook["bankSource"];
  const notebook = createPracticeNotebook(
    {
      bankId: bank.id,
      bankSource,
      name: bank.title || bank.name || "未命名题集",
      type: bank.subject || bank.type || "",
      author: bank.author || "",
      kind: NotebookKind.PRACTICE
    },
    questions,
    {
      emptyResults: true,
      includeQuestionsSnapshot: true
    }
  );

  const sessionQuestions = resolveSourceQuestions(notebook, [{ id: bank.id, questions }]);
  const practiceQuestions = sessionQuestions.length ? sessionQuestions : questions;
  applyProgressToQuestions(practiceQuestions, notebookToProgressRecord(notebook));
  assignPracticeSession(notebook, practiceQuestions, PracticeMode.RESUME);
  router.push("/practice");
  return true;
}

/** Load a local/remote bank into a new practice notebook (no auto-resume). */
export function loadBankIntoPractice(bank: PracticeBankInput): boolean {
  const questions = normalizeQuestions(bank.questions);
  if (!questions.length) return false;

  const bankSource = (bank.source || "local") as PracticeNotebook["bankSource"];
  const notebook = createPracticeNotebook(
    {
      bankId: bank.id,
      bankSource,
      name: bank.title || bank.name || "未命名题集",
      type: bank.subject || bank.type || "",
      author: bank.author || "",
      kind: NotebookKind.PRACTICE
    },
    questions,
    {
      emptyResults: true,
      includeQuestionsSnapshot: true
    }
  );
  const sessionQuestions = resolveSourceQuestions(notebook, [{ id: bank.id, questions }]);
  const practiceQuestions = sessionQuestions.length ? sessionQuestions : questions;
  applyProgressToQuestions(practiceQuestions, notebookToProgressRecord(notebook));
  assignPracticeSession(notebook, practiceQuestions, PracticeMode.RESUME);
  return true;
}

export function resumeNotebook(
  notebook: PracticeNotebook,
  banks: BankLookupItem[]
): boolean {
  const hasSnapshot = Boolean(
    Array.isArray(notebook.checkpoint.questions) && notebook.checkpoint.questions.length
  );
  if (notebook.checkpoint.invalidReason && !hasSnapshot) return false;
  const questions = normalizeQuestions(resolveSourceQuestions(notebook, banks as BankLike[]));
  if (!questions.length) return false;

  const record = notebookToProgressRecord(notebook);
  applyProgressToQuestions(questions, record);
  assignPracticeSession(
    notebook,
    questions,
    notebook.kind === NotebookKind.WRONG ? PracticeMode.WRONG : PracticeMode.RESUME
  );
  return true;
}

export function resumeNotebookAndGo(
  notebook: PracticeNotebook,
  banks: BankLookupItem[],
  router: Router
): boolean {
  if (!resumeNotebook(notebook, banks)) return false;
  router.push("/practice");
  return true;
}

export function startPracticeFromBank(bank: PracticeBankInput, router: Router): boolean {
  return startNewPracticeFromBank(bank, router);
}

export function resumeProgressRecord(
  record: { status?: string; notebookId?: string; bankId: string } & PracticeNotebook,
  banks: BankLookupItem[]
): boolean {
  if (record.status === ProgressStatus.INVALID) return false;
  return resumeNotebook(record, banks);
}
