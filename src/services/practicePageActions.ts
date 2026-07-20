import type { Question } from "../models/question/types";
import { resetQuestionProgress } from "../models/question/progress";
import { buildWrongQuestionsSet } from "../models/question/wrongQuestions";
import {
  buildSessionBankId,
  buildProgressRecord,
  saveProgressRecord,
  type BankSource
} from "./practiceProgress";
import {
  addBankFromExisting,
  createBankFromQuestions,
  type Bank
} from "./questionBank";
import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync";
import { loadRemoteQuestionBanks, reloadRemoteBanksFromCache } from "./remoteQuestionBanks";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState";
import { getAnswerSlotCount } from "../utils/questions";

export const PROGRESS_CHANGED_EVENT = "txt-storage-changed";

export interface QuestionsJSON {
  bankId?: string;
  bankSource?: BankSource | string;
  version?: string;
  name?: string;
  type?: string;
  author?: string;
  questions?: Question[];
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface RetryWrongOptions {
  includePartial?: boolean;
}

export function notifyProgressChanged(): void {
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

function getQuestions(questionsJSON: QuestionsJSON | null | undefined): Question[] {
  return Array.isArray(questionsJSON?.questions) ? questionsJSON.questions : [];
}

export function clearAllQuestionResults(questions: Question[]): void {
  if (!Array.isArray(questions)) return;
  questions.forEach((question) => {
    const slotCount = getAnswerSlotCount(question);
    question.results = Array.from({ length: slotCount }, () => undefined);
  });
}

export function saveProgressToBrowser(questionsJSON: QuestionsJSON): ActionResult {
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可保存的题目。" };
  }
  if (!questionsJSON?.bankId) {
    return { ok: false, message: "缺少题集标识，无法保存进度。" };
  }

  const bankSource = (questionsJSON.bankSource || "session") as BankSource;
  const record = buildProgressRecord(
    {
      bankId: questionsJSON.bankId,
      bankSource,
      name: questionsJSON.name,
      type: questionsJSON.type,
      author: questionsJSON.author,
      version: questionsJSON.version
    },
    questions,
    { includeQuestionsSnapshot: bankSource === "session" }
  );
  saveProgressRecord(record);
  return { ok: true, message: "题集进度已保存到浏览器。" };
}

function findRemoteBank(bankId: string) {
  if (!bankId) return null;
  const inMemory = questionBankState.remoteBanks.find((item) => item.id === bankId);
  if (inMemory) return inMemory;
  reloadRemoteBanksFromCache();
  return questionBankState.remoteBanks.find((item) => item.id === bankId) ?? null;
}

function createLocalBankFromQuestionsJSON(
  questionsJSON: QuestionsJSON,
  questions: Question[]
): ActionResult {
  const result = createBankFromQuestions("local", {
    title: questionsJSON.name || "",
    subject: questionsJSON.type || "",
    author: questionsJSON.author || "",
    questions
  });
  if (!result.ok) {
    questionBankState.localBanks = result.banks;
    return { ok: false, message: result.message };
  }
  questionBankState.localBanks = result.banks;
  return { ok: true, message: "已将题集保存到本地题库。" };
}

export async function saveQuestionBankToLocal(questionsJSON: QuestionsJSON): Promise<ActionResult> {
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可保存的题目。" };
  }

  reloadLocalBanks();

  const bankSource = questionsJSON.bankSource || "session";
  const bankId = questionsJSON.bankId;

  if (bankSource === "local" && bankId) {
    const exists = questionBankState.localBanks.some((item) => item.id === bankId);
    if (exists) {
      return { ok: false, message: "当前题集已在本地题库。" };
    }
  }

  if (bankSource === "remote" && bankId) {
    let target = findRemoteBank(bankId);
    if (!target) {
      await loadRemoteQuestionBanks();
      target = questionBankState.remoteBanks.find((item) => item.id === bankId) ?? null;
    }
    if (target) {
      const result = addBankFromExisting("local", target as Bank);
      if (!result.ok) {
        questionBankState.localBanks = result.banks;
        return { ok: false, message: result.message };
      }
      questionBankState.localBanks = result.banks;
      return { ok: true, message: "已将题集保存到本地题库。" };
    }
    return createLocalBankFromQuestionsJSON(questionsJSON, questions);
  }

  return createLocalBankFromQuestionsJSON(questionsJSON, questions);
}

export function applyRedoAllQuestions(questionsJSON: QuestionsJSON): ActionResult {
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可重做的题目。" };
  }

  clearAllQuestionResults(questions);
  resetQuestionProgress(questions);
  return saveProgressToBrowser(questionsJSON);
}

export function applyRetryWrongQuestions(
  questionsJSON: QuestionsJSON,
  options: RetryWrongOptions = {}
): ActionResult {
  const { includePartial = false } = options;
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可重做的题目。" };
  }

  const retrySet = buildWrongQuestionsSet(questionsJSON, questions, {
    includePartial,
    clearResults: true
  });
  if (!retrySet.questions.length) {
    return { ok: false, message: "当前没有错题可重做。" };
  }

  questionsJSON.name = retrySet.name;
  questionsJSON.type = retrySet.type;
  questionsJSON.author = retrySet.author;
  questionsJSON.version = retrySet.version;
  questionsJSON.questions = retrySet.questions;

  if ((questionsJSON.bankSource || "session") === "session") {
    questionsJSON.bankId = buildSessionBankId(
      {
        name: questionsJSON.name,
        type: questionsJSON.type,
        author: questionsJSON.author,
        version: questionsJSON.version
      },
      retrySet.questions
    );
  }

  resetQuestionProgress(retrySet.questions);
  const saveResult = saveProgressToBrowser(questionsJSON);
  if (!saveResult.ok) {
    return saveResult;
  }

  return { ok: true, message: "已切换为错题重做，请重新作答。" };
}
