import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProgressFilter,
  ProgressStatus,
  __clearAllProgressForTests,
  applyProgressToQuestions,
  buildProgressRecord,
  buildSessionBankId,
  countByStatus,
  deriveStatus,
  enrichWithValidity,
  getProgressRecord,
  listIncompleteRecords,
  listProgressRecords,
  removeProgressRecord,
  saveProgressRecord
} from "./practiceProgress.js";

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
    results: [undefined],
    MD5: false,
    image: ""
  }
];

const storage = {};

function createLocalStorageMock() {
  return {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => {
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

describe("practiceProgress", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal("CustomEvent", class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    });
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
    __clearAllProgressForTests();
  });

  it("builds stable session bank id", () => {
    const meta = { name: "测试", type: "法规", author: "作者", version: "0.0.2" };
    const id1 = buildSessionBankId(meta, sampleQuestions);
    const id2 = buildSessionBankId(meta, sampleQuestions);
    expect(id1).toBe(id2);
    expect(id1.startsWith("session-")).toBe(true);
  });

  it("saves and loads progress records", () => {
    const record = buildProgressRecord(
      { bankId: "local-1", bankSource: "local", name: "测试题集" },
      sampleQuestions
    );
    saveProgressRecord(record);
    const loaded = getProgressRecord("local-1");
    expect(loaded?.name).toBe("测试题集");
    expect(loaded?.results[0][0]).toBe("2");
  });

  it("dispatches storage changed event when saving progress", () => {
    const record = buildProgressRecord(
      { bankId: "local-notify", bankSource: "local", name: "通知测试" },
      sampleQuestions
    );
    saveProgressRecord(record);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(window.dispatchEvent.mock.calls[0][0].detail.kind).toBe("practiceProgress");
  });

  it("removes progress records", () => {
    const record = buildProgressRecord(
      { bankId: "local-2", bankSource: "local", name: "删除测试" },
      sampleQuestions
    );
    saveProgressRecord(record);
    removeProgressRecord("local-2");
    expect(getProgressRecord("local-2")).toBeNull();
  });

  it("applies saved results to questions", () => {
    const questions = JSON.parse(JSON.stringify(sampleQuestions));
    questions[1].results = [undefined];
    const record = buildProgressRecord(
      { bankId: "local-3", bankSource: "local", name: "恢复测试" },
      sampleQuestions
    );
    record.results[1] = ["3"];
    const ok = applyProgressToQuestions(questions, record);
    expect(ok).toBe(true);
    expect(questions[1].results[0]).toBe("3");
  });

  it("derives inProgress and completed status", () => {
    const inProgress = buildProgressRecord(
      { bankId: "s1", bankSource: "local", name: "进行中" },
      sampleQuestions
    );
    expect(deriveStatus(inProgress)).toBe(ProgressStatus.IN_PROGRESS);

    const completedQuestions = JSON.parse(JSON.stringify(sampleQuestions));
    completedQuestions[1].results = ["3"];
    const completed = buildProgressRecord(
      { bankId: "s2", bankSource: "local", name: "已完成" },
      completedQuestions
    );
    expect(deriveStatus(completed)).toBe(ProgressStatus.COMPLETED);
  });

  it("marks bank-backed records invalid when bank missing", () => {
    const record = buildProgressRecord(
      { bankId: "missing-bank", bankSource: "local", name: "失效" },
      sampleQuestions
    );
    const enriched = enrichWithValidity(record, []);
    expect(enriched.invalidReason).toBe("bankMissing");
    expect(deriveStatus(enriched)).toBe(ProgressStatus.INVALID);
  });

  it("filters records by status", () => {
    saveProgressRecord(
      buildProgressRecord({ bankId: "a", bankSource: "local", name: "进行中" }, sampleQuestions)
    );
    const completedQuestions = JSON.parse(JSON.stringify(sampleQuestions));
    completedQuestions[1].results = ["3"];
    saveProgressRecord(
      buildProgressRecord({ bankId: "b", bankSource: "local", name: "已完成" }, completedQuestions)
    );

    const banks = [
      { id: "a", questions: sampleQuestions },
      { id: "b", questions: completedQuestions }
    ];

    const all = listProgressRecords({ filter: ProgressFilter.ALL }, banks);
    expect(all).toHaveLength(2);

    const incomplete = listIncompleteRecords(banks);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].bankId).toBe("a");

    const counts = countByStatus(all);
    expect(counts.inProgress).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("stores session question snapshot when requested", () => {
    const record = buildProgressRecord(
      { bankId: "session-1", bankSource: "session", name: "首页" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    expect(record.questions).toHaveLength(2);
    expect(enrichWithValidity(record, []).invalidReason).toBeUndefined();
  });
});
