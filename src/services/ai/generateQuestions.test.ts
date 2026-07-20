import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterValidQuestions,
  formatQuestionText,
  formatQuestionsForDisplay,
  generateQuestionsFromAi,
  isValidTxtLine,
  maskTxtAnswers,
  normalizeGenerationPayload,
  parseGenerationJson,
  processGenerationResult,
  stripMarkdownCodeFence,
  type GeneratedQuestion
} from "./generateQuestions";

vi.mock("./llmClient.js", () => ({
  llmChat: vi.fn(),
  llmChatStream: vi.fn()
}));

import { llmChat, llmChatStream } from "./llmClient";

describe("generateQuestions helpers", () => {
  it("masks underscore answers for chat display", () => {
    expect(maskTxtAnswers("1+1=_2_")).toBe("1+1=____");
    expect(maskTxtAnswers("下面正确的字符常量是_c,C_。")).toBe("下面正确的字符常量是____。");
  });

  it("formats a single question with optional answers", () => {
    expect(formatQuestionText("1+1=_2_", false)).toBe("1+1=____");
    expect(formatQuestionText("1+1=_2_", true)).toBe("1+1=_2_");
  });

  it("formats a single question with optional answers", () => {
    expect(formatQuestionText("1+1=_2_", false)).toBe("1+1=____");
    expect(formatQuestionText("1+1=_2_", true)).toBe("1+1=_2_");
  });

  it("formats questions for chat with optional answers", () => {
    const questions = [{ txt: "1+1=_2_" }, { txt: "2+2=_4_" }];
    expect(formatQuestionsForDisplay(questions, false)).toBe("1. 1+1=____\n\n2. 2+2=____");
    expect(formatQuestionsForDisplay(questions, true)).toBe("1. 1+1=_2_\n\n2. 2+2=_4_");
  });

  it("masks underscore answers for chat display", () => {
    expect(maskTxtAnswers("1+1=_2_")).toBe("1+1=____");
    expect(maskTxtAnswers("下面正确的字符常量是_c,C_。")).toBe("下面正确的字符常量是____。");
  });

  it("formats questions for chat with optional answers", () => {
    const questions = [{ txt: "1+1=_2_" }, { txt: "2+2=_4_" }];
    expect(formatQuestionsForDisplay(questions, false)).toBe("1. 1+1=____\n\n2. 2+2=____");
    expect(formatQuestionsForDisplay(questions, true)).toBe("1. 1+1=_2_\n\n2. 2+2=_4_");
  });

  it("validates txt lines with buildQuestionsFromTxt rules", () => {
    expect(isValidTxtLine("1+1=_2_")).toBe(true);
    expect(isValidTxtLine("")).toBe(false);
    expect(isValidTxtLine("no blanks here")).toBe(false);
    expect(isValidTxtLine("odd_underscore")).toBe(false);
  });

  it("strips markdown code fences before parsing", () => {
    const fenced = '```json\n{"name":"测试"}\n```';
    expect(stripMarkdownCodeFence(fenced)).toBe('{"name":"测试"}');
    expect(parseGenerationJson(fenced)).toEqual({ name: "测试" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseGenerationJson("not json")).toBeNull();
  });

  it("normalizes generation payload and drops empty txt", () => {
    const normalized = normalizeGenerationPayload({
      name: " 数学 ",
      type: "数学",
      author: "AI",
      questions: [
        { txt: " 1+1=_2_ ", answer: "2", explanation: " 基础加法 " },
        { txt: "   " },
        { foo: "bar" }
      ]
    });
    expect(normalized).toEqual({
      name: "数学",
      type: "数学",
      author: "AI",
      questions: [{ txt: "1+1=_2_", answer: "2", explanation: "基础加法" }]
    });
  });

  it("filters invalid questions and preserves answer fields", () => {
    const { valid, invalidCount } = filterValidQuestions([
      { txt: "1+1=_2_", answer: "2", explanation: "加法" },
      { txt: "invalid" },
      { txt: "bad_underscore" }
    ] as unknown as GeneratedQuestion[]);
    expect(valid).toEqual([{ txt: "1+1=_2_", answer: "2", explanation: "加法" }]);
    expect(invalidCount).toBe(2);
  });

  it("processGenerationResult returns ok with valid questions", () => {
    const result = processGenerationResult(
      JSON.stringify({
        name: "测试题集",
        type: "数学",
        author: "AI",
        questions: [{ txt: "1+1=_2_" }, { txt: "broken" }]
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.questions).toHaveLength(1);
    }
    expect(result.invalidCount).toBe(1);
    expect(result.message).toContain("已过滤 1 道");
  });

  it("processGenerationResult fails when all questions invalid", () => {
    const result = processGenerationResult(
      JSON.stringify({
        questions: [{ txt: "broken" }]
      })
    );
    expect(result.ok).toBe(false);
    expect(result.invalidCount).toBe(1);
  });
});

describe("generateQuestionsFromAi", () => {
  beforeEach(() => {
    vi.mocked(llmChat).mockReset();
    vi.mocked(llmChatStream).mockReset();
  });

  it("requires prompt and api key", async () => {
    const noPrompt = await generateQuestionsFromAi({
      prompt: "",
      config: { apiKey: "sk-test" }
    });
    expect(noPrompt.ok).toBe(false);

    const noKey = await generateQuestionsFromAi({
      prompt: "生成 5 道数学题",
      config: { apiKey: "" }
    });
    expect(noKey.ok).toBe(false);
  });

  it("calls llmChat and processes JSON response", async () => {
    vi.mocked(llmChat).mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        name: "方程练习",
        type: "数学",
        author: "AI",
        questions: [{ txt: "x^2-1=0 的解为 _1,-1_" }]
      }),
      reasoning: ""
    });

    const result = await generateQuestionsFromAi({
      prompt: "生成 5 道一元二次方程填空题",
      config: {
        baseURL: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 4096,
        thinkingEnabled: false,
        reasoningEffort: "high"
      }
    });

    expect(llmChat).toHaveBeenCalledOnce();
    expect(llmChat).toHaveBeenCalledWith(
      expect.objectContaining({
        thinkingEnabled: false,
        reasoningEffort: "high",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("生成 5 道一元二次方程填空题")
          })
        ])
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("方程练习");
      expect(result.data.questions).toHaveLength(1);
    }
  });

  it("includes reference content in user message when references are provided", async () => {
    vi.mocked(llmChat).mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        questions: [{ txt: "1+1=_2_" }]
      }),
      reasoning: ""
    });

    await generateQuestionsFromAi({
      prompt: "根据参考内容生成 3 题",
      references: [{ name: "notes.txt", content: "一元二次方程定义", size: 8 }],
      config: { apiKey: "sk-test", thinkingEnabled: false }
    });

    expect(llmChat).toHaveBeenCalledWith(
      expect.objectContaining({
        thinkingEnabled: false,
        reasoningEffort: "high",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringMatching(/【参考内容】[\s\S]*notes\.txt[\s\S]*一元二次方程定义/)
          })
        ])
      })
    );
  });

  it("uses llmChatStream only when thinking callbacks are provided", async () => {
    vi.mocked(llmChatStream).mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        name: "方程练习",
        type: "数学",
        author: "AI",
        questions: [{ txt: "x^2-1=0 的解为 _1,-1_" }]
      }),
      reasoning: "先分析题型"
    });

    const onReasoningDelta = vi.fn();
    const result = await generateQuestionsFromAi({
      prompt: "生成 5 道一元二次方程填空题",
      config: {
        apiKey: "sk-test",
        thinkingEnabled: true,
        reasoningEffort: "high"
      },
      onReasoningDelta
    });

    expect(llmChatStream).toHaveBeenCalledOnce();
    expect(llmChat).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reasoning).toBe("先分析题型");
    }
  });

  it("uses llmChat when thinking is enabled without stream callbacks", async () => {
    vi.mocked(llmChat).mockResolvedValue({
      ok: true,
      content: JSON.stringify({
        questions: [{ txt: "1+1=_2_" }]
      }),
      reasoning: "hidden"
    });

    await generateQuestionsFromAi({
      prompt: "测试",
      config: { apiKey: "sk-test", thinkingEnabled: true }
    });

    expect(llmChat).toHaveBeenCalledOnce();
    expect(llmChatStream).not.toHaveBeenCalled();
  });

  it("returns API error message from llmChat", async () => {
    vi.mocked(llmChat).mockResolvedValue({
      ok: false,
      message: "API Key 无效或未授权，请检查密钥。"
    });

    const result = await generateQuestionsFromAi({
      prompt: "测试",
      config: { apiKey: "bad-key" }
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("API Key");
  });
});
