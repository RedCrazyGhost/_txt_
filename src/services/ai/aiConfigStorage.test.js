import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_FORMAT,
  DEFAULT_AI_CONFIG,
  getOpenAIDefaults,
  loadAiConfig,
  saveAiConfig
} from "./aiConfigStorage.js";

describe("aiConfigStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        store: {},
        getItem(key) {
          return this.store[key] ?? null;
        },
        setItem(key, value) {
          this.store[key] = value;
        }
      }
    });
    window.localStorage.store = {};
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
    });

    expect(saved.apiFormat).toBe(API_FORMAT);
    expect(saved.baseURL).toBe("https://api.deepseek.com");
    expect(saved.model).toBe("deepseek-v4-pro");
    expect(saved.thinkingEnabled).toBe(true);
  });

  it("getOpenAIDefaults returns official OpenAI defaults", () => {
    expect(getOpenAIDefaults().baseURL).toBe("https://api.openai.com/v1");
  });
});
