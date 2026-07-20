import type { Router } from "vue-router";
import { resetQuestionProgress } from "../models/question/progress";
import type { Question } from "../models/question/types";
import { appState } from "../state/appState";
import { normalizeQuestionWithDetection, resolveQuestionBankVersion } from "../utils/questions";
import {
  ProgressStatus,
  applyProgressToQuestions,
  getProgressRecord,
  type EnrichedProgressRecord
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

function normalizeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((question) => normalizeQuestionWithDetection(question));
}

/** Load a local/remote bank into the practice session (restores saved progress if any). */
export function loadBankIntoPractice(bank: PracticeBankInput): boolean {
  const questions = normalizeQuestions(bank.questions);
  if (!questions.length) return false;

  appState.questionsJSON = {
    bankId: bank.id,
    bankSource: bank.source || "local",
    version: resolveQuestionBankVersion(questions),
    name: bank.title || bank.name || "未命名题集",
    type: bank.subject || bank.type || "",
    author: bank.author || "",
    questions
  };

  const saved = getProgressRecord(bank.id);
  if (saved) {
    applyProgressToQuestions(questions, saved);
  }
  resetQuestionProgress(questions);
  return true;
}

export function resolveQuestionsForProgress(
  record: EnrichedProgressRecord,
  banks: BankLookupItem[]
): Question[] | null {
  if (record.bankSource === "session") {
    const questions = normalizeQuestions(record.questions);
    return questions.length ? questions : null;
  }

  const bank = banks.find((item) => item.id === record.bankId);
  if (!bank) return null;
  const questions = normalizeQuestions(bank.questions);
  return questions.length ? questions : null;
}

/** Resume a progress record into the practice session. */
export function resumeProgressRecord(
  record: EnrichedProgressRecord,
  banks: BankLookupItem[]
): boolean {
  if (record.status === ProgressStatus.INVALID) return false;

  const questions = resolveQuestionsForProgress(record, banks);
  if (!questions?.length) return false;

  applyProgressToQuestions(questions, record);

  appState.questionsJSON = {
    bankId: record.bankId,
    bankSource: record.bankSource ?? "",
    version: resolveQuestionBankVersion(questions),
    name: record.name ?? "",
    type: record.type ?? "",
    author: record.author ?? "",
    questions
  };
  resetQuestionProgress(questions);
  return true;
}

export function startPracticeFromBank(bank: PracticeBankInput, router: Router): boolean {
  if (!loadBankIntoPractice(bank)) return false;
  router.push("/practice");
  return true;
}

export function resumeProgressAndGo(
  record: EnrichedProgressRecord,
  banks: BankLookupItem[],
  router: Router
): boolean {
  if (!resumeProgressRecord(record, banks)) return false;
  router.push("/practice");
  return true;
}
