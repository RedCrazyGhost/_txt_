import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../models/question/types";
import {
  addBankFromExisting,
  createBankFromQuestions,
  isDraftBank,
  isEmptyEditorDraft,
  isPublishedBank,
  loadBanks,
  persistBanks,
  publishBankFromQuestions,
  LOCAL_BANK_ALREADY_EXISTS_MESSAGE,
  STORAGE_QUOTA_EXCEEDED_MESSAGE,
  upsertEditorDraft,
  type Bank
} from "./questionBank";
import { APP_STORAGE_KEYS } from "./browserStorage";

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
      APP_STORAGE_KEYS.localBanks,
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
    expect(result.banks[0].status).toBe("published");
  });

  it("treats banks without status as published", () => {
    const legacy: Bank = {
      id: "local-legacy",
      source: "local",
      title: "旧题集",
      subject: "",
      author: "",
      updatedAt: new Date().toISOString(),
      questions: []
    };
    expect(isPublishedBank(legacy)).toBe(true);
    expect(isDraftBank(legacy)).toBe(false);
  });

  it("skips empty editor draft upsert", () => {
    const result = upsertEditorDraft("local", {
      title: "",
      subject: "",
      author: "",
      questions: [],
      editorTxts: [{ txt: "", MD5: false, image: "", noDelete: false }]
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.banks).toHaveLength(0);
  });

  it("creates and updates editor draft with txts", () => {
    const created = upsertEditorDraft("local", {
      title: "草稿题集",
      subject: "数学",
      author: "我",
      questions: [],
      editorTxts: [{ txt: "题目1", MD5: false, image: "", noDelete: false }]
    });
    expect(created.ok).toBe(true);
    expect(created.skipped).toBeFalsy();
    expect(created.bankId).toBeTruthy();
    expect(created.banks[0].status).toBe("draft");
    expect(created.banks[0].editorTxts?.[0]?.txt).toBe("题目1");

    const bankId = created.bankId!;
    const updated = upsertEditorDraft("local", {
      id: bankId,
      title: "草稿题集",
      subject: "数学",
      author: "我",
      questions: [{ stem: "Q1" } as Question],
      editorTxts: [{ txt: "题目1", MD5: false, image: "", noDelete: false }]
    });
    expect(updated.ok).toBe(true);
    expect(updated.banks.find((b) => b.id === bankId)?.questions).toHaveLength(1);
    expect(updated.banks.find((b) => b.id === bankId)?.status).toBe("draft");
  });

  it("autosave keeps published status when editing local bank", () => {
    const created = createBankFromQuestions("local", {
      title: "已发布题集",
      subject: "类型",
      author: "作者",
      questions: [{ stem: "Q1" } as Question]
    });
    const bankId = created.banks[0].id;

    const autosaved = upsertEditorDraft("local", {
      id: bankId,
      title: "已发布题集",
      subject: "类型",
      author: "作者",
      questions: [{ stem: "Q1" } as Question, { stem: "Q2" } as Question],
      editorTxts: [{ txt: "新录入", MD5: false, image: "", noDelete: false }]
    });
    expect(autosaved.ok).toBe(true);
    const bank = autosaved.banks.find((b) => b.id === bankId);
    expect(bank?.status).toBe("published");
    expect(bank?.questions).toHaveLength(2);
    expect(autosaved.banks.filter((b) => b.status === "draft")).toHaveLength(0);
  });

  it("does not create duplicate draft when update id is missing", () => {
    const created = upsertEditorDraft("local", {
      title: "草稿",
      editorTxts: [{ txt: "x", MD5: false, image: "", noDelete: false }]
    });
    expect(created.banks).toHaveLength(1);

    const missing = upsertEditorDraft("local", {
      id: "local-missing-id",
      title: "不应新建",
      editorTxts: [{ txt: "y", MD5: false, image: "", noDelete: false }]
    });
    expect(missing.ok).toBe(false);
    expect(loadBanks("local")).toHaveLength(1);
    expect(loadBanks("local")[0]?.title).toBe("草稿");
  });

  it("publish clears editorTxts and sets published status", () => {
    const draft = upsertEditorDraft("local", {
      title: "待发布",
      editorTxts: [{ txt: "x", MD5: false, image: "", noDelete: false }],
      questions: [{ stem: "Q" } as Question]
    });
    const bankId = draft.bankId!;

    const published = publishBankFromQuestions("local", bankId, {
      title: "已发布",
      subject: "类型",
      author: "作者",
      questions: [{ stem: "Q" } as Question]
    });
    expect(published.ok).toBe(true);
    const bank = published.banks.find((b) => b.id === bankId);
    expect(bank?.status).toBe("published");
    expect(bank?.editorTxts).toBeUndefined();
    expect(bank?.title).toBe("已发布");
  });

  it("publish rejects empty questions", () => {
    const result = publishBankFromQuestions("local", null, {
      title: "空",
      questions: []
    });
    expect(result.ok).toBe(false);
    expect(loadBanks("local")).toHaveLength(0);
  });

  it("publish does not overwrite existing published local bank", () => {
    const created = createBankFromQuestions("local", {
      title: "已有题集",
      subject: "类型",
      author: "作者",
      questions: [{ stem: "原题" } as Question]
    });
    const bankId = created.banks[0].id;

    const again = publishBankFromQuestions("local", bankId, {
      title: "试图覆盖",
      subject: "新类型",
      author: "新作者",
      questions: [{ stem: "新题" } as Question]
    });
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.message).toBe(LOCAL_BANK_ALREADY_EXISTS_MESSAGE);
    }
    const bank = loadBanks("local").find((item) => item.id === bankId);
    expect(bank?.title).toBe("已有题集");
    expect(bank?.questions).toHaveLength(1);
    expect((bank?.questions[0] as Question).stem).toBe("原题");
  });

  it("detects empty editor draft", () => {
    expect(
      isEmptyEditorDraft({
        title: "",
        questions: [],
        editorTxts: [{ txt: "  ", MD5: false, image: "", noDelete: false }]
      })
    ).toBe(true);
    expect(
      isEmptyEditorDraft({
        title: "有名称",
        questions: [],
        editorTxts: []
      })
    ).toBe(false);
  });
});
