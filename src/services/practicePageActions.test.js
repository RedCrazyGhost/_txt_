import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __clearAllProgressForTests,
  getProgressRecord
} from "./practiceProgress.js";
import {
  clearAllQuestionResults,
  saveProgressToBrowser,
  saveQuestionBankToLocal
} from "./practicePageActions.js";

const storage = {};
let shouldRejectWrite = false;

function createLocalStorageMock() {
  return {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => {
      if (shouldRejectWrite) {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        error.code = 22;
        throw error;
      }
      storage[key] = String(value);
    },
    removeItem: (key) => {
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
];

describe("practicePageActions", () => {
  beforeEach(() => {
    shouldRejectWrite = false;
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal("CustomEvent", class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    });
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
    __clearAllProgressForTests();
  });

  it("clears all question results", () => {
    const questions = JSON.parse(JSON.stringify(sampleQuestions));
    clearAllQuestionResults(questions);
    expect(questions[0].results[0]).toBeUndefined();
    expect(questions[1].results[0]).toBeUndefined();
  });

  it("saves progress to browser storage", () => {
    const questionsJSON = {
      bankId: "local-1",
      bankSource: "local",
      name: "测试题集",
      type: "法规",
      author: "作者",
      version: "0.0.2",
      questions: JSON.parse(JSON.stringify(sampleQuestions))
    };

    const result = saveProgressToBrowser(questionsJSON);
    expect(result.ok).toBe(true);
    const saved = getProgressRecord("local-1");
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
      "_txt_local_banks",
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
      questions: JSON.parse(JSON.stringify(sampleQuestions))
    });

    expect(result.ok).toBe(true);
    const raw = window.localStorage.getItem("_txt_local_banks");
    const banks = JSON.parse(raw);
    expect(banks).toHaveLength(1);
    expect(banks[0].title).toBe("首页题集");
  });

  it("falls back to current questions when remote bank metadata is missing", async () => {
    const result = await saveQuestionBankToLocal({
      bankId: "C-2021-08-25.json",
      bankSource: "remote",
      name: "2021-08-25",
      type: "C语言",
      author: "RedCrazyGhost",
      questions: JSON.parse(JSON.stringify(sampleQuestions))
    });

    expect(result.ok).toBe(true);
    const raw = window.localStorage.getItem("_txt_local_banks");
    const banks = JSON.parse(raw);
    expect(banks).toHaveLength(1);
    expect(banks[0].title).toBe("2021-08-25");
  });

  it("returns quota message when saving remote bank to local fails", async () => {
    shouldRejectWrite = true;

    const result = await saveQuestionBankToLocal({
      bankId: "remote-1",
      bankSource: "remote",
      name: "远程题集",
      type: "测试",
      author: "作者",
      questions: JSON.parse(JSON.stringify(sampleQuestions))
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("存储空间不足");
    expect(window.localStorage.getItem("_txt_local_banks")).toBeNull();
  });
});
