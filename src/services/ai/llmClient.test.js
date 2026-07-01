import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOpenAIRequestBody,
  extractMessageReasoning,
  extractStreamDelta,
  fetchModelsList,
  fetchUserBalance,
  formatBalanceInfo,
  isDeepSeekBaseURL,
  llmChat,
  llmChatStream
} from "./llmClient.js";

vi.mock("openai", () => {
  class APIError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  class OpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: (...args) => {
            if (!globalThis.__openaiCreateMock) {
              throw new Error("OpenAI create mock is not configured.");
            }
            return globalThis.__openaiCreateMock(...args);
          }
        }
      };
    }
  }

  OpenAI.APIError = APIError;

  return { default: OpenAI };
});

describe("extractStreamDelta", () => {
  it("reads reasoning_content and content from stream chunks", () => {
    expect(
      extractStreamDelta({
        choices: [{ delta: { reasoning_content: "step 1", content: "{" } }]
      })
    ).toEqual({ reasoning: "step 1", content: "{" });
  });

  it("falls back to reasoning and thinking string fields", () => {
    expect(
      extractStreamDelta({
        choices: [{ delta: { reasoning: "r", thinking: "t" } }]
      })
    ).toEqual({ reasoning: "r", content: "" });
  });
});

describe("extractMessageReasoning", () => {
  it("reads reasoning fields from completion message", () => {
    expect(extractMessageReasoning({ reasoning_content: "done" })).toBe("done");
    expect(extractMessageReasoning({ reasoning: "alt" })).toBe("alt");
  });
});

describe("buildOpenAIRequestBody", () => {
  it("includes thinking options when enabled", () => {
    const payload = buildOpenAIRequestBody({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
      jsonMode: true,
      thinkingEnabled: true,
      reasoningEffort: "high"
    });

    expect(payload).toEqual(
      expect.objectContaining({
        model: "deepseek-v4-pro",
        stream: false,
        response_format: { type: "json_object" },
        thinking: { type: "enabled" },
        reasoning_effort: "high"
      })
    );
  });

  it("omits thinking fields when disabled", () => {
    const payload = buildOpenAIRequestBody({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      thinkingEnabled: false
    });

    expect(payload.thinking).toBeUndefined();
    expect(payload.reasoning_effort).toBeUndefined();
  });
});

describe("isDeepSeekBaseURL", () => {
  it("detects DeepSeek endpoints", () => {
    expect(isDeepSeekBaseURL("https://api.deepseek.com")).toBe(true);
    expect(isDeepSeekBaseURL("https://api.deepseek.com/v1")).toBe(true);
    expect(isDeepSeekBaseURL("https://api.openai.com/v1")).toBe(false);
  });
});

describe("formatBalanceInfo", () => {
  it("formats balance details", () => {
    expect(
      formatBalanceInfo({
        is_available: true,
        balance_infos: [
          {
            currency: "CNY",
            total_balance: "110.00",
            granted_balance: "10.00",
            topped_up_balance: "100.00"
          }
        ]
      })
    ).toBe("CNY 110.00（赠金 10.00 + 充值 100.00）");
  });

  it("marks unavailable balance", () => {
    expect(
      formatBalanceInfo({
        is_available: false,
        balance_infos: [{ currency: "CNY", total_balance: "0.00" }]
      })
    ).toBe("CNY 0.00 · 当前余额不可用");
  });
});

describe("fetchModelsList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns model ids from /models", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        object: "list",
        data: [
          { id: "deepseek-v4-flash", object: "model" },
          { id: "deepseek-v4-pro", object: "model" }
        ]
      })
    });

    const result = await fetchModelsList({
      baseURL: "https://api.deepseek.com",
      apiKey: "sk-test"
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/models",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer sk-test" })
      })
    );
    expect(result).toEqual({
      ok: true,
      models: ["deepseek-v4-flash", "deepseek-v4-pro"]
    });
  });

  it("returns error when models list is empty", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ object: "list", data: [] })
    });

    const result = await fetchModelsList({
      baseURL: "https://api.deepseek.com",
      apiKey: "sk-test"
    });

    expect(result.ok).toBe(false);
  });
});

describe("fetchUserBalance", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls /user/balance", async () => {
    const payload = {
      is_available: true,
      balance_infos: [{ currency: "CNY", total_balance: "10.00" }]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => payload
    });

    const result = await fetchUserBalance({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: "sk-test"
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/v1/user/balance",
      expect.any(Object)
    );
    expect(result).toEqual({ ok: true, data: payload });
  });
});

describe("llmChat", () => {
  beforeEach(() => {
    globalThis.__openaiCreateMock = vi.fn();
  });

  it("calls OpenAI SDK chat.completions.create", async () => {
    globalThis.__openaiCreateMock.mockResolvedValue({
      choices: [{ message: { content: "ok", reasoning_content: "thought" } }]
    });

    const result = await llmChat({
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }]
    });

    expect(globalThis.__openaiCreateMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, content: "ok", reasoning: "thought" });
  });
});

describe("llmChatStream", () => {
  beforeEach(() => {
    globalThis.__openaiCreateMock = vi.fn();
  });

  it("aggregates streamed reasoning and content", async () => {
    async function* mockStream() {
      yield { choices: [{ delta: { reasoning_content: "think" } }] };
      yield { choices: [{ delta: { content: '{"questions":[]}' } }] };
    }

    globalThis.__openaiCreateMock.mockResolvedValue(mockStream());

    const reasoningChunks = [];
    const contentChunks = [];

    const result = await llmChatStream({
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
      thinkingEnabled: true,
      onReasoningDelta: (full) => reasoningChunks.push(full),
      onContentDelta: (full) => contentChunks.push(full)
    });

    expect(globalThis.__openaiCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );
    expect(reasoningChunks).toEqual(["think"]);
    expect(contentChunks).toEqual(['{"questions":[]}']);
    expect(result).toEqual({
      ok: true,
      content: '{"questions":[]}',
      reasoning: "think"
    });
  });
});
