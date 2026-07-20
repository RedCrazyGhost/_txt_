import { beforeEach, describe, expect, it, vi } from "vitest";
import { appState } from "../state/appState";
import { ProgressStatus, type EnrichedProgressRecord } from "./practiceProgress";

vi.mock("./practiceProgress", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./practiceProgress")>();
  return {
    ...actual,
    getProgressRecord: vi.fn(() => null),
    applyProgressToQuestions: vi.fn(() => true)
  };
});

vi.mock("../models/question/progress", () => ({
  resetQuestionProgress: vi.fn()
}));

import { getProgressRecord } from "./practiceProgress";
import { loadBankIntoPractice, resumeProgressRecord } from "./practiceSession";

describe("practiceSession", () => {
  beforeEach(() => {
    appState.questionsJSON = {
      bankId: "",
      bankSource: "",
      version: "0.0.2",
      name: "",
      type: "",
      author: "",
      questions: []
    };
    vi.mocked(getProgressRecord).mockReturnValue(null);
  });

  it("loadBankIntoPractice writes questionsJSON and returns true", () => {
    const ok = loadBankIntoPractice({
      id: "local-1",
      source: "local",
      title: "函数",
      subject: "数学",
      author: "测",
      questions: [{ texts: ["1+1=", ""], answers: [["2"]], image: "", MD5: false }]
    });
    expect(ok).toBe(true);
    expect(appState.questionsJSON.bankId).toBe("local-1");
    expect(appState.questionsJSON.name).toBe("函数");
    expect(appState.questionsJSON.questions).toHaveLength(1);
  });

  it("loadBankIntoPractice returns false for empty questions", () => {
    expect(loadBankIntoPractice({ id: "x", questions: [] })).toBe(false);
  });

  it("resumeProgressRecord loads session snapshot questions", () => {
    const record = {
      bankId: "session-abc",
      bankSource: "session",
      name: "草稿",
      type: "",
      author: "",
      questionCount: 1,
      updatedAt: new Date().toISOString(),
      results: [[undefined]],
      stats: {
        totalSlots: 1,
        attemptedSlots: 0,
        correctSlots: 0,
        partialSlots: 0,
        wrongSlots: 0,
        unansweredQuestionIndexes: [0],
        wrongQuestionCount: 0,
        partialQuestionCount: 0
      },
      status: ProgressStatus.IN_PROGRESS,
      questions: [{ texts: ["a=", ""], answers: [["1"]], image: "", MD5: false }]
    } as unknown as EnrichedProgressRecord;

    const ok = resumeProgressRecord(record, []);
    expect(ok).toBe(true);
    expect(appState.questionsJSON.bankId).toBe("session-abc");
    expect(appState.questionsJSON.name).toBe("草稿");
  });
});
