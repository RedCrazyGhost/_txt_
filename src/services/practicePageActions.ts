import type { Question } from "../models/question/types";
import { resetQuestionProgress } from "../models/question/progress";
import { cloneQuestionWithEmptyResults } from "../models/question/wrongQuestions";
import {
  NotebookKind,
  PracticeMode,
  buildProgressRecord,
  createPracticeNotebook,
  createWrongNotebook,
  getNotebook,
  isResumePracticeMode,
  saveProgressRecord,
  type BankLike,
  type BankSource,
  type PracticeMode as PracticeModeType,
  type PracticeNotebook
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
import type { PracticeMode as AppPracticeMode } from "../state/appState";

export const PROGRESS_CHANGED_EVENT = "txt-storage-changed";

export interface QuestionsJSON {
  notebookId?: string;
  bankId?: string;
  bankSource?: BankSource | string;
  version?: string;
  name?: string;
  type?: string;
  author?: string;
  questions?: Question[];
  practiceMode?: PracticeModeType | AppPracticeMode;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface RetryWrongOptions {
  includePartial?: boolean;
  banks?: BankLike[];
}

export function notifyProgressChanged(): void {
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

function getQuestions(questionsJSON: QuestionsJSON | null | undefined): Question[] {
  return Array.isArray(questionsJSON?.questions) ? questionsJSON.questions : [];
}

function ensurePracticeNotebook(questionsJSON: QuestionsJSON, questions: Question[]): PracticeNotebook | null {
  if (questionsJSON.notebookId) {
    const existing = getNotebook(questionsJSON.notebookId);
    if (existing) return existing;
  }
  if (!questionsJSON.bankId || !questions.length) return null;

  const bankSource = (questionsJSON.bankSource || "session") as BankSource;
  const notebook = createPracticeNotebook(
    {
      notebookId: questionsJSON.notebookId,
      bankId: questionsJSON.bankId,
      bankSource,
      name: questionsJSON.name,
      type: questionsJSON.type,
      author: questionsJSON.author,
      version: questionsJSON.version,
      kind: questionsJSON.practiceMode === PracticeMode.WRONG ? NotebookKind.WRONG : NotebookKind.PRACTICE
    },
    questions,
    {
      includeQuestionsSnapshot: true
    }
  );
  questionsJSON.notebookId = notebook.id;
  return notebook;
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

  const notebook = ensurePracticeNotebook(questionsJSON, questions);
  if (!notebook) {
    return { ok: false, message: "缺少做题本标识，无法保存进度。" };
  }

  const bankSource = (questionsJSON.bankSource || notebook.bankSource || "session") as BankSource;
  const record = buildProgressRecord(
    {
      notebookId: notebook.id,
      bankId: questionsJSON.bankId,
      bankSource,
      name: questionsJSON.name,
      type: questionsJSON.type,
      author: questionsJSON.author,
      version: questionsJSON.version,
      kind: notebook.kind,
      parentNotebookId: notebook.parentNotebookId
    },
    questions,
    {
      includeQuestionsSnapshot: !notebook.checkpoint.questions?.length
    }
  );
  saveProgressRecord(record);
  return { ok: true, message: "断点进度已保存到浏览器。" };
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

/**
 * 从当前卷面生成错题本并写入练习档案，不切换当前做题会话。
 */
export function applyGenerateWrongNotebook(
  questionsJSON: QuestionsJSON,
  options: RetryWrongOptions = {}
): ActionResult {
  const { includePartial = false, banks = [] } = options;
  const questions = getQuestions(questionsJSON);
  if (!questions.length) {
    return { ok: false, message: "当前没有可重做的题目。" };
  }
  if (!questionsJSON.bankId) {
    return { ok: false, message: "缺少题集标识，无法生成错题本。" };
  }

  const saveResult = saveProgressToBrowser(questionsJSON);
  if (!saveResult.ok) return saveResult;

  const parent = questionsJSON.notebookId ? getNotebook(questionsJSON.notebookId) : null;
  if (!parent) {
    return { ok: false, message: "找不到对应的做题本，无法生成错题本。" };
  }

  const wrongNotebook = createWrongNotebook(parent, {
    includePartial,
    banks,
    sourceQuestions: questions
  });
  if (!wrongNotebook?.checkpoint.questions?.length) {
    return {
      ok: false,
      message: includePartial ? "当前没有错题或半对可生成错题本。" : "当前没有错题可生成错题本。"
    };
  }

  notifyProgressChanged();
  return {
    ok: true,
    message: includePartial
      ? "已生成错题本（含半对），可在练习档案查看。"
      : "已生成错题本，可在练习档案查看。"
  };
}

/** @deprecated 使用 applyGenerateWrongNotebook；保留别名以兼容旧调用。 */
export function applyRetryWrongQuestions(
  questionsJSON: QuestionsJSON,
  options: RetryWrongOptions = {}
): ActionResult {
  return applyGenerateWrongNotebook(questionsJSON, options);
}

export function applyDailyReviewQuestions(): ActionResult {
  return { ok: false, message: "每日复习已改为错题本，请从练习档案生成错题本。" };
}

export function startWrongPracticeFromBank(
  questionsJSON: QuestionsJSON,
  banks: BankLike[] = []
): ActionResult {
  if (!questionsJSON.notebookId) {
    return { ok: false, message: "缺少做题本标识。" };
  }
  const parent = getNotebook(questionsJSON.notebookId);
  if (!parent) {
    return { ok: false, message: "找不到对应的做题本。" };
  }
  const wrongNotebook = createWrongNotebook(parent, { banks });
  if (!wrongNotebook?.checkpoint.questions?.length) {
    return { ok: false, message: "当前没有错题。" };
  }
  questionsJSON.notebookId = wrongNotebook.id;
  questionsJSON.bankId = wrongNotebook.bankId;
  questionsJSON.bankSource = wrongNotebook.bankSource;
  questionsJSON.name = wrongNotebook.name;
  questionsJSON.type = wrongNotebook.type;
  questionsJSON.author = wrongNotebook.author;
  questionsJSON.version = wrongNotebook.version;
  questionsJSON.practiceMode = PracticeMode.WRONG;
  questionsJSON.questions = wrongNotebook.checkpoint.questions.map((question) =>
    cloneQuestionWithEmptyResults(question)
  );
  resetQuestionProgress(questionsJSON.questions);
  return { ok: true, message: "已生成错题本，请重新作答。" };
}

export { isResumePracticeMode };
