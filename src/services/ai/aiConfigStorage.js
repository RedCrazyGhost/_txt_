export const AI_CONFIG_STORAGE_KEY = "_txt_ai_config";

export const API_FORMAT = "openai";

export const REASONING_EFFORTS = ["low", "medium", "high"];

export const OPENAI_DEFAULTS = {
  baseURL: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  thinkingEnabled: false
};

export const DEFAULT_AI_CONFIG = {
  apiFormat: API_FORMAT,
  baseURL: OPENAI_DEFAULTS.baseURL,
  apiKey: "",
  model: OPENAI_DEFAULTS.model,
  temperature: 0.7,
  maxTokens: 16384,
  thinkingEnabled: OPENAI_DEFAULTS.thinkingEnabled,
  reasoningEffort: "high"
};

function normalizeReasoningEffort(value) {
  const effort = String(value ?? DEFAULT_AI_CONFIG.reasoningEffort).toLowerCase();
  return REASONING_EFFORTS.includes(effort) ? effort : DEFAULT_AI_CONFIG.reasoningEffort;
}

export function getOpenAIDefaults() {
  return { ...OPENAI_DEFAULTS };
}

function normalizeConfig(raw) {
  const merged = { ...DEFAULT_AI_CONFIG, ...(raw && typeof raw === "object" ? raw : {}) };

  return {
    apiFormat: API_FORMAT,
    baseURL:
      String(merged.baseURL || OPENAI_DEFAULTS.baseURL).trim() || OPENAI_DEFAULTS.baseURL,
    apiKey: String(merged.apiKey ?? ""),
    model: String(merged.model || OPENAI_DEFAULTS.model).trim() || OPENAI_DEFAULTS.model,
    temperature: Number.isFinite(Number(merged.temperature))
      ? Number(merged.temperature)
      : DEFAULT_AI_CONFIG.temperature,
    maxTokens: Number.isFinite(Number(merged.maxTokens))
      ? Number(merged.maxTokens)
      : DEFAULT_AI_CONFIG.maxTokens,
    thinkingEnabled:
      raw && Object.prototype.hasOwnProperty.call(raw, "thinkingEnabled")
        ? Boolean(merged.thinkingEnabled)
        : OPENAI_DEFAULTS.thinkingEnabled,
    reasoningEffort: normalizeReasoningEffort(merged.reasoningEffort)
  };
}

export function loadAiConfig() {
  if (typeof window === "undefined") return { ...DEFAULT_AI_CONFIG };
  const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_AI_CONFIG };
  try {
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config) {
  const normalized = normalizeConfig(config);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
