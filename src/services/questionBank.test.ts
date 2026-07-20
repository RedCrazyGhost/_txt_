import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../models/question/types";
import {
  addBankFromExisting,
  createBankFromQuestions,
  persistBanks,
  STORAGE_QUOTA_EXCEEDED_MESSAGE,
  type Bank
} from "./questionBank";

const storage: Record<string, string> = {};
let shouldRejectWrite = false;

function createLocalStorageMock() {
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => {
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

describe("questionBank persistence", () => {
  beforeEach(() => {
    shouldRejectWrite = false;
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent<T = unknown> {
        type: string;
        detail?: T;

        constructor(type: string, init: { detail?: T } = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      }
    );
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
  });

  it("returns quota message when localStorage is full", () => {
    shouldRejectWrite = true;
    const bank: Bank = {
      id: "local-1",
      source: "local",
      title: "题库",
      subject: "",
      author: "",
      updatedAt: new Date().toISOString(),
      questions: []
    };
    const result = persistBanks("local", [bank]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(STORAGE_QUOTA_EXCEEDED_MESSAGE);
    }
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
      subject: "",
      author: "",
      updatedAt: new Date().toISOString(),
      questions: [{ stem: "题目" } as Question]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(STORAGE_QUOTA_EXCEEDED_MESSAGE);
    }
    expect(result.banks).toHaveLength(1);
    expect(result.banks[0].title).toBe("已有");
  });

  it("creates local bank when storage has enough space", () => {
    const result = createBankFromQuestions("local", {
      title: "新题集",
      subject: "测试",
      author: "作者",
      questions: [{ stem: "题目" } as Question]
    });

    expect(result.ok).toBe(true);
    expect(result.banks).toHaveLength(1);
    expect(result.banks[0].title).toBe("新题集");
  });
});
