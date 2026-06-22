import { resetQuestionProgress } from "../models/question/progress.ts";
import { buildWrongQuestionsSet } from "../models/question/wrongQuestions.ts";
import { buildSessionBankId, buildProgressRecord, saveProgressRecord } from "./practiceProgress.js";
import {
  addBankFromExisting,
  createBankFromQuestions
} from "./questionBank.js";
import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync.js";
import { loadRemoteQuestionBanks, reloadRemoteBanksFromCache } from "./remoteQuestionBanks.js";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState.js";
import { getAnswerSlotCount } from "../utils/questions.ts";

export const PROGRESS_CHANGED_EVENT = "txt-storage-changed";

export function notifyProgressChanged() {
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

function getQuestions(questionsJSON) {
  return Array.isArray(questionsJSON?.questions) ? questionsJSON.questions : [];
}

export function clearAllQuestionResults(questions) {
  if (!Array.isArray(questions)) return;
  questions.forEach((question) => {
    const slotCount = getAnswerSlotCount(question);
    question.results = Array.from({ length: slotCount }, () => undefined);
  });
}

export function saveProgressToBrowser(questionsJSON) {
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可保存的题目。" };
  }
  if (!questionsJSON?.bankId) {
    return { ok: false, message: "缺少题集标识，无法保存进度。" };
  }

  const bankSource = questionsJSON.bankSource || "session";
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

function findRemoteBank(bankId) {
  if (!bankId) return null;
  const inMemory = questionBankState.remoteBanks.find((item) => item.id === bankId);
  if (inMemory) return inMemory;
  reloadRemoteBanksFromCache();
  return questionBankState.remoteBanks.find((item) => item.id === bankId) ?? null;
}

function createLocalBankFromQuestionsJSON(questionsJSON, questions) {
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

export async function saveQuestionBankToLocal(questionsJSON) {
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
      const result = addBankFromExisting("local", target);
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

export function applyRedoAllQuestions(questionsJSON) {
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可重做的题目。" };
  }

  clearAllQuestionResults(questions);
  resetQuestionProgress(questions);
  return saveProgressToBrowser(questionsJSON);
}

export function applyRetryWrongQuestions(questionsJSON, options = {}) {
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
