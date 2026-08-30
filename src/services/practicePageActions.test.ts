import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../models/question/types";
import {
  __clearAllProgressForTests,
  getNotebook,
  getProgressRecord,
  listNotebooks,
  NotebookKind,
  saveProgressRecord,
  buildProgressRecord
} from "./practiceProgress";
import {
  applyRetryWrongQuestions,
  clearAllQuestionResults,
  saveProgressToBrowser,
  saveQuestionBankToLocal,
  type QuestionsJSON
} from "./practicePageActions";
import { APP_STORAGE_KEYS } from "./browserStorage";

const storage: Record<string, string> = {};
let shouldRejectWrite = false;

function createLocalStorageMock() {
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: unknown) => {
      if (shouldRejectWrite) {
        const error = new Error("QuotaExceededError") as Error & { code: number };
        error.name = "QuotaExceededError";
        error.code = 22;
        throw error;
      }
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }
  };
}

const sampleQuestions = [
  {
    questionType: "fillBlank",
    texts: ["a", "2", ""],
    answers: [["2"]],
    results: ["2"],
    MD5: false,
    image: ""
  },
  {
    questionType: "fillBlank",
    texts: ["b", "3", ""],
    answers: [["3"]],
    results: ["4"],
    MD5: false,
    image: ""
  }
] as Question[];

describe("practicePageActions", () => {
  beforeEach(() => {
    shouldRejectWrite = false;
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      }
    );
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
    __clearAllProgressForTests();
  });

  it("clears all question results", () => {
    const questions = JSON.parse(JSON.stringify(sampleQuestions)) as Question[];
    clearAllQuestionResults(questions);
    expect(questions[0]!.results![0]).toBeUndefined();
    expect(questions[1]!.results![0]).toBeUndefined();
  });

  it("saves progress to browser storage", () => {
    const questionsJSON: QuestionsJSON = {
      bankId: "local-1",
      bankSource: "local",
      name: "测试题集",
      type: "法规",
      author: "作者",
      version: "0.0.2",
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    };

    const result = saveProgressToBrowser(questionsJSON);
    expect(result.ok).toBe(true);
    expect(questionsJSON.notebookId).toBeTruthy();
    const saved = getProgressRecord(questionsJSON.notebookId!);
    expect(saved?.results[0][0]).toBe("2");
    expect(saved?.results[1][0]).toBe("4");
  });

  it("rejects saving progress without bankId", () => {
    const result = saveProgressToBrowser({
      name: "测试",
      questions: sampleQuestions
    });
    expect(result.ok).toBe(false);
  });

  it("returns message when local bank already exists", async () => {
    window.localStorage.setItem(
      APP_STORAGE_KEYS.localBanks,
      JSON.stringify([
        {
          id: "local-existing",
          source: "local",
          title: "已有题集",
          subject: "",
          author: "",
          updatedAt: new Date().toISOString(),
          questions: sampleQuestions
        }
      ])
    );

    const result = await saveQuestionBankToLocal({
      bankId: "local-existing",
      bankSource: "local",
      name: "已有题集",
      questions: sampleQuestions
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("已在本地题库");
  });

  it("creates local bank for session question set", async () => {
    const result = await saveQuestionBankToLocal({
      bankSource: "session",
      name: "首页题集",
      type: "测试",
      author: "作者",
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    });

    expect(result.ok).toBe(true);
    const raw = window.localStorage.getItem(APP_STORAGE_KEYS.localBanks);
    const banks = JSON.parse(raw!) as Array<{ title: string }>;
    expect(banks).toHaveLength(1);
    expect(banks[0]!.title).toBe("首页题集");
  });

  it("falls back to current questions when remote bank metadata is missing", async () => {
    const result = await saveQuestionBankToLocal({
      bankId: "C-2021-08-25.json",
      bankSource: "remote",
      name: "2021-08-25",
      type: "C语言",
      author: "RedCrazyGhost",
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    });

    expect(result.ok).toBe(true);
    const raw = window.localStorage.getItem(APP_STORAGE_KEYS.localBanks);
    const banks = JSON.parse(raw!) as Array<{ title: string }>;
    expect(banks).toHaveLength(1);
    expect(banks[0]!.title).toBe("2021-08-25");
  });

  it("returns quota message when saving remote bank to local fails", async () => {
    shouldRejectWrite = true;

    const result = await saveQuestionBankToLocal({
      bankId: "remote-1",
      bankSource: "remote",
      name: "远程题集",
      type: "测试",
      author: "作者",
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("存储空间不足");
    expect(window.localStorage.getItem(APP_STORAGE_KEYS.localBanks)).toBeNull();
  });

  it("saves checkpoint for wrong notebooks", () => {
    const parent = buildProgressRecord(
      { bankId: "mode-1", bankSource: "local", name: "题集" },
      sampleQuestions
    );
    saveProgressRecord(parent);

    const result = saveProgressToBrowser({
      notebookId: parent.notebookId,
      bankId: "mode-1",
      bankSource: "local",
      name: "题集",
      practiceMode: "wrong",
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    });

    expect(result.ok).toBe(true);
    expect(getProgressRecord(parent.notebookId)?.results[1]?.[0]).toBe("4");
  });

  it("generates a wrong notebook without switching the current session", () => {
    const parent = buildProgressRecord(
      { bankId: "retry-1", bankSource: "local", name: "原题集" },
      sampleQuestions
    );
    saveProgressRecord(parent);

    const questionsJSON = {
      notebookId: parent.notebookId,
      bankId: "retry-1",
      bankSource: "local",
      name: "原题集",
      type: "",
      author: "",
      version: "0.0.2",
      practiceMode: "resume" as const,
      questions: JSON.parse(JSON.stringify(sampleQuestions)) as Question[]
    };

    const result = applyRetryWrongQuestions(questionsJSON, {
      banks: [{ id: "retry-1", questions: sampleQuestions }]
    });

    expect(result.ok).toBe(true);
    expect(questionsJSON.bankId).toBe("retry-1");
    expect(questionsJSON.practiceMode).toBe("resume");
    expect(questionsJSON.questions).toHaveLength(2);
    expect(questionsJSON.notebookId).toBe(parent.notebookId);
    expect(getNotebook(parent.notebookId)?.checkpoint.results[0]?.[0]).toBe("2");

    const wrongChildren = listNotebooks({}, [{ id: "retry-1", questions: sampleQuestions }]).filter(
      (item) => item.kind === NotebookKind.WRONG && item.parentNotebookId === parent.notebookId
    );
    expect(wrongChildren).toHaveLength(1);
    expect(wrongChildren[0]?.checkpoint.questions).toHaveLength(1);
  });
});
