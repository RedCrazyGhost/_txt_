import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_FORMAT,
  DEFAULT_AI_CONFIG,
  getOpenAIDefaults,
  loadAiConfig,
  saveAiConfig,
  type AiConfigInput
} from "./aiConfigStorage";

interface MockStorage {
  store: Record<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

describe("aiConfigStorage", () => {
  beforeEach(() => {
    const localStorage: MockStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = value;
      }
    };

    vi.stubGlobal("window", { localStorage });
    (window.localStorage as unknown as MockStorage).store = {};
  });

  it("returns OpenAI defaults when storage is empty", () => {
    expect(loadAiConfig()).toEqual(
      expect.objectContaining({
        apiFormat: API_FORMAT,
        baseURL: DEFAULT_AI_CONFIG.baseURL,
        model: DEFAULT_AI_CONFIG.model
      })
    );
  });

  it("persists config and always normalizes apiFormat to openai", () => {
    const saved = saveAiConfig({
      apiFormat: "anthropic",
      apiKey: "sk-test",
      baseURL: "https://api.deepseek.com",
      model: "deepseek-v4-pro",
      thinkingEnabled: true
    } as unknown as AiConfigInput);

    expect(saved.apiFormat).toBe(API_FORMAT);
    expect(saved.baseURL).toBe("https://api.deepseek.com");
    expect(saved.model).toBe("deepseek-v4-pro");
    expect(saved.thinkingEnabled).toBe(true);
  });

  it("getOpenAIDefaults returns official OpenAI defaults", () => {
    expect(getOpenAIDefaults().baseURL).toBe("https://api.openai.com/v1");
  });
});
