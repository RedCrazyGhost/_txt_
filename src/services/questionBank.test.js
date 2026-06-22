import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addBankFromExisting,
  createBankFromQuestions,
  persistBanks,
  STORAGE_QUOTA_EXCEEDED_MESSAGE
} from "./questionBank.js";

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

describe("questionBank persistence", () => {
  beforeEach(() => {
    shouldRejectWrite = false;
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal("CustomEvent", class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    });
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
  });

  it("returns quota message when localStorage is full", () => {
    shouldRejectWrite = true;
    const result = persistBanks("local", [{ id: "local-1", title: "题库", questions: [] }]);
    expect(result.ok).toBe(false);
    expect(result.message).toBe(STORAGE_QUOTA_EXCEEDED_MESSAGE);
  });

  it("does not update local banks when addBankFromExisting fails", () => {
    window.localStorage.setItem(
      "_txt_local_banks",
      JSON.stringify([{ id: "local-existing", source: "local", title: "已有", questions: [] }])
    );
    shouldRejectWrite = true;

    const result = addBankFromExisting("local", {
      id: "remote-1",
      source: "remote",
      title: "新题库",
      questions: [{ stem: "题目" }]
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe(STORAGE_QUOTA_EXCEEDED_MESSAGE);
    expect(result.banks).toHaveLength(1);
    expect(result.banks[0].title).toBe("已有");
  });

  it("creates local bank when storage has enough space", () => {
    const result = createBankFromQuestions("local", {
      title: "新题集",
      subject: "测试",
      author: "作者",
      questions: [{ stem: "题目" }]
    });

    expect(result.ok).toBe(true);
    expect(result.banks).toHaveLength(1);
    expect(result.banks[0].title).toBe("新题集");
  });
});
