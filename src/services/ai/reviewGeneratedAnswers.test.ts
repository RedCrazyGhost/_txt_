import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractTxtAnswerSlots,
  formatReviewStatusMessage,
  isAnswerFieldConsistentWithTxt,
  mergeReviewsOntoQuestions,
  normalizeVerdict,
  parseReviewPayload,
  reviewGeneratedAnswers,
  summarizeReviewVerdicts
} from "./reviewGeneratedAnswers";

vi.mock("./llmClient.js", () => ({
  llmChat: vi.fn()
}));

import { llmChat } from "./llmClient";

describe("normalizeVerdict", () => {
  it("accepts known verdicts and falls back to uncertain", () => {
    expect(normalizeVerdict("pass")).toBe("pass");
    expect(normalizeVerdict("FAIL")).toBe("fail");
    expect(normalizeVerdict(" maybe ")).toBe("uncertain");
  });
});

describe("extractTxtAnswerSlots / consistency", () => {
  it("extracts underscore answer slots", () => {
    expect(extractTxtAnswerSlots("1+1=_2_")).toEqual(["2"]);
    expect(extractTxtAnswerSlots("答=_a,A_\nA. x")).toEqual(["a,A"]);
  });

  it("treats matching answer field as consistent", () => {
    expect(isAnswerFieldConsistentWithTxt("1+1=_2_", "2")).toBe(true);
    expect(isAnswerFieldConsistentWithTxt("选_c,C_\nA.1\nB.2\nC.3", "C")).toBe(true);
  });

  it("flags mismatched answer field as inconsistent", () => {
    expect(isAnswerFieldConsistentWithTxt("1+1=_2_", "3")).toBe(false);
    expect(isAnswerFieldConsistentWithTxt("选_c,C_\nA.1", "B")).toBe(false);
  });
});

describe("parseReviewPayload", () => {
  it("parses reviews array and normalizes fields", () => {
    const reviews = parseReviewPayload(
      JSON.stringify({
        reviews: [
          { index: 0, verdict: "pass", reason: " ok " },
          { index: 1, verdict: "WRONG", reason: "坏" }
        ]
      })
    );

    expect(reviews).toEqual([
      { index: 0, verdict: "pass", reason: "ok" },
      { index: 1, verdict: "uncertain", reason: "坏" }
    ]);
  });

  it("returns null for invalid payloads", () => {
    expect(parseReviewPayload("not json")).toBeNull();
    expect(parseReviewPayload('{"foo":[]}')).toBeNull();
  });
});

describe("mergeReviewsOntoQuestions", () => {
  const questions = [
    { txt: "1+1=_2_", answer: "2", explanation: "加法" },
    { txt: "2+2=_4_", answer: "5", explanation: "错" },
    { txt: "选_b,B_\nA.1\nB.2", answer: "B", explanation: "选B" }
  ];

  it("aligns by index and fills missing as uncertain", () => {
    const merged = mergeReviewsOntoQuestions(questions, [
      { index: 0, verdict: "pass", reason: "正确" },
      { index: 2, verdict: "fail", reason: "应选 A" }
    ]);

    expect(merged[0].verdict).toBe("pass");
    expect(merged[0].reviewReason).toBe("正确");
    expect(merged[1].verdict).toBe("uncertain");
    expect(merged[1].reviewReason).toContain("answer 字段与 txt");
    expect(merged[2].verdict).toBe("fail");
  });

  it("downgrades pass when local answer/txt inconsistent", () => {
    const merged = mergeReviewsOntoQuestions(
      [{ txt: "1+1=_2_", answer: "9", explanation: "x" }],
      [{ index: 0, verdict: "pass", reason: "模型判对" }]
    );

    expect(merged[0].verdict).toBe("uncertain");
    expect(merged[0].reviewReason).toContain("模型判对");
    expect(merged[0].reviewReason).toContain("不一致");
  });
});

describe("summarizeReviewVerdicts / formatReviewStatusMessage", () => {
  it("counts verdicts and formats status text", () => {
    const summary = summarizeReviewVerdicts([
      { verdict: "pass" },
      { verdict: "pass" },
      { verdict: "fail" },
      { verdict: "uncertain" }
    ]);

    expect(summary).toEqual({ pass: 2, fail: 1, uncertain: 1, total: 4 });
    expect(formatReviewStatusMessage(summary, { generationMessage: "成功生成 4 道题目。" })).toContain(
      "复核通过 2，不通过 1，存疑 1"
    );
    expect(
      formatReviewStatusMessage(summary, {
        generationMessage: "成功生成 4 道题目。",
        reviewFailed: true,
        reviewFailMessage: "超时"
      })
    ).toContain("自动复核失败（超时）");
  });
});

describe("reviewGeneratedAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges model reviews on success", async () => {
    vi.mocked(llmChat).mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        reviews: [
          { index: 0, verdict: "pass", reason: "对" },
          { index: 1, verdict: "fail", reason: "错" }
        ]
      }),
      reasoning: ""
    });

    const result = await reviewGeneratedAnswers({
      questions: [
        { txt: "1+1=_2_", answer: "2", explanation: "a" },
        { txt: "2+2=_5_", answer: "5", explanation: "b" }
      ],
      config: { baseURL: "https://api.example.com", apiKey: "k", model: "m" }
    });

    expect(result.ok).toBe(true);
    expect(result.reviewFailed).toBe(false);
    expect(result.questions[0].verdict).toBe("pass");
    expect(result.questions[1].verdict).toBe("fail");
    expect(llmChat).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonMode: true,
        thinkingEnabled: false,
        temperature: 0.2
      })
    );
  });

  it("falls back to uncertain when API fails", async () => {
    vi.mocked(llmChat).mockResolvedValue({ ok: false, message: "额度不足" });

    const result = await reviewGeneratedAnswers({
      questions: [{ txt: "1+1=_2_", answer: "2", explanation: "a" }],
      config: { baseURL: "https://api.example.com", apiKey: "k", model: "m" }
    });

    expect(result.ok).toBe(false);
    expect(result.reviewFailed).toBe(true);
    expect(result.questions[0].verdict).toBe("uncertain");
    expect(result.questions[0].reviewReason).toContain("额度不足");
  });

  it("falls back when review JSON cannot be parsed", async () => {
    vi.mocked(llmChat).mockResolvedValue({ ok: true, content: "not-json", reasoning: "" });

    const result = await reviewGeneratedAnswers({
      questions: [{ txt: "1+1=_2_", answer: "2", explanation: "a" }],
      config: { baseURL: "https://api.example.com", apiKey: "k", model: "m" }
    });

    expect(result.ok).toBe(false);
    expect(result.reviewFailed).toBe(true);
    expect(result.questions[0].verdict).toBe("uncertain");
  });
});
