export const AI_CONFIG_STORAGE_KEY = "_txt_ai_config";

export const API_FORMAT = "openai" as const;

export const REASONING_EFFORTS = ["low", "medium", "high"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type ApiFormat = typeof API_FORMAT;

export interface AiConfig {
  apiFormat: ApiFormat;
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort;
}

export type AiConfigInput = Partial<AiConfig> | null | undefined;

export interface OpenAIDefaults {
  baseURL: string;
  model: string;
  thinkingEnabled: boolean;
}

export const OPENAI_DEFAULTS: OpenAIDefaults = {
  baseURL: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  thinkingEnabled: false
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiFormat: API_FORMAT,
  baseURL: "",
  apiKey: "",
  model: OPENAI_DEFAULTS.model,
  temperature: 0.7,
  maxTokens: 16384,
  thinkingEnabled: OPENAI_DEFAULTS.thinkingEnabled,
  reasoningEffort: "high"
};

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  const effort = String(value ?? DEFAULT_AI_CONFIG.reasoningEffort).toLowerCase();
  return REASONING_EFFORTS.includes(effort as ReasoningEffort)
    ? (effort as ReasoningEffort)
    : DEFAULT_AI_CONFIG.reasoningEffort;
}

export function getOpenAIDefaults(): OpenAIDefaults {
  return { ...OPENAI_DEFAULTS };
}

/** 请求用 OpenAI Base URL：未填写时回落官方默认，表单仍只显示灰色 placeholder。 */
export function resolveBaseURL(baseURL: unknown): string {
  const trimmed = String(baseURL ?? "").trim();
  return trimmed || OPENAI_DEFAULTS.baseURL;
}

export function resolveAiConfig(config: AiConfigInput): AiConfig {
  const normalized = normalizeConfig(config);
  return {
    ...normalized,
    baseURL: resolveBaseURL(normalized.baseURL)
  };
}

function normalizeConfig(raw: AiConfigInput): AiConfig {
  const merged = { ...DEFAULT_AI_CONFIG, ...(raw && typeof raw === "object" ? raw : {}) };
  const trimmedBaseURL = String(merged.baseURL ?? "").trim();

  return {
    apiFormat: API_FORMAT,
    // 官方默认只作 placeholder，不写入输入框
    baseURL: trimmedBaseURL === OPENAI_DEFAULTS.baseURL ? "" : trimmedBaseURL,
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

export function loadAiConfig(): AiConfig {
  if (typeof window === "undefined") return { ...DEFAULT_AI_CONFIG };
  const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_AI_CONFIG };
  try {
    return normalizeConfig(JSON.parse(raw) as AiConfigInput);
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfigInput): AiConfig {
  const normalized = normalizeConfig(config);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
