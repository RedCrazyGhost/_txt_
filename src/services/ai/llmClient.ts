import OpenAI from "openai";
import type { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ReasoningEffort } from "./aiConfigStorage";
import type { ChatMessage } from "./prompts";

export type LlmFailure = { ok: false; message: string };

export type LlmChatSuccess = { ok: true; content: string; reasoning: string };

export type LlmChatResult = LlmChatSuccess | LlmFailure;

export type ModelsListSuccess = { ok: true; models: string[] };

export type ModelsListResult = ModelsListSuccess | LlmFailure;

export type ApiFetchSuccess = { ok: true; data: unknown };

export type ApiFetchResult = ApiFetchSuccess | LlmFailure;

export interface ApiCredentials {
  baseURL: string;
  apiKey: string;
}

export interface StreamDelta {
  reasoning: string;
  content: string;
}

export interface OpenAIRequestBody {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
  response_format?: { type: "json_object" };
  thinking?: { type: "enabled" };
  reasoning_effort?: ReasoningEffort;
}

export interface BuildOpenAIRequestBodyOptions {
  model: string;
  messages: ChatCompletionMessageParam[] | ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  thinkingEnabled?: boolean;
  reasoningEffort?: ReasoningEffort | string;
  stream?: boolean;
}

export interface LlmChatOptions extends ApiCredentials {
  model: string;
  messages: ChatCompletionMessageParam[] | ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  thinkingEnabled?: boolean;
  reasoningEffort?: ReasoningEffort | string;
}

export interface LlmChatStreamOptions extends LlmChatOptions {
  onReasoningDelta?: (fullReasoning: string, delta: string) => void;
  onContentDelta?: (fullContent: string, delta: string) => void;
}

export interface BalanceInfoEntry {
  currency?: string;
  total_balance?: string | number;
  granted_balance?: string | number | null;
  topped_up_balance?: string | number | null;
}

export interface BalanceInfoData {
  is_available?: boolean;
  balance_infos?: BalanceInfoEntry[];
}

interface ApiErrorBody {
  error?: { message?: string };
  message?: string;
}

interface StreamDeltaFields {
  reasoning_content?: string;
  reasoning?: string;
  thinking?: string;
  content?: string;
}

interface StreamChunkShape {
  choices?: Array<{ delta?: StreamDeltaFields; message?: StreamDeltaFields }>;
}

interface CompletionMessageShape {
  content?: string | null;
  reasoning_content?: string;
  reasoning?: string;
}

function normalizeBaseURL(baseURL: unknown): string {
  return String(baseURL || "").trim().replace(/\/+$/, "");
}

export function isDeepSeekBaseURL(baseURL: unknown): boolean {
  return /deepseek\.com/i.test(String(baseURL || ""));
}

function buildApiUrl(baseURL: unknown, path: string): string {
  const base = normalizeBaseURL(baseURL);
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `${base}${segment}`;
}

async function authorizedApiFetch({
  baseURL,
  apiKey,
  path
}: ApiCredentials & { path: string }): Promise<ApiFetchResult> {
  const response = await fetch(buildApiUrl(baseURL, path), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      (response.status === 401
        ? "API Key 无效或未授权，请检查密钥。"
        : response.status === 404
          ? "接口地址不存在，请检查 OpenAI Base URL 是否正确。"
          : `请求失败（HTTP ${response.status}）。`);
    return { ok: false, message };
  }

  return { ok: true, data: body };
}

export async function fetchModelsList({ baseURL, apiKey }: ApiCredentials): Promise<ModelsListResult> {
  if (!String(baseURL || "").trim()) {
    return { ok: false, message: "请填写 OpenAI Base URL。" };
  }
  if (!String(apiKey || "").trim()) {
    return { ok: false, message: "请填写 API Key。" };
  }

  try {
    const result = await authorizedApiFetch({ baseURL, apiKey, path: "/models" });
    if (!result.ok) return result;

    const data = result.data as { data?: Array<{ id?: string }> } | null;
    const models = Array.isArray(data?.data)
      ? data.data
          .map((item) => String(item?.id ?? "").trim())
          .filter(Boolean)
      : [];

    if (!models.length) {
      return { ok: false, message: "未获取到可用模型。" };
    }

    return { ok: true, models };
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export async function fetchUserBalance({ baseURL, apiKey }: ApiCredentials): Promise<ApiFetchResult> {
  if (!String(baseURL || "").trim()) {
    return { ok: false, message: "请填写 OpenAI Base URL。" };
  }
  if (!String(apiKey || "").trim()) {
    return { ok: false, message: "请填写 API Key。" };
  }

  try {
    return await authorizedApiFetch({ baseURL, apiKey, path: "/user/balance" });
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export function formatBalanceInfo(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const balanceData = data as BalanceInfoData;
  const infos = Array.isArray(balanceData.balance_infos) ? balanceData.balance_infos : [];
  if (!infos.length) return "";

  const parts = infos.map((info) => {
    const currency = String(info?.currency ?? "").trim();
    const total = info?.total_balance ?? "—";
    const granted = info?.granted_balance;
    const topped = info?.topped_up_balance;

    let text = currency ? `${currency} ${total}` : String(total);
    if (granted != null && topped != null) {
      text += `（赠金 ${granted} + 充值 ${topped}）`;
    }
    return text;
  });

  let summary = parts.join("；");
  if (balanceData.is_available === false) {
    summary += " · 当前余额不可用";
  }
  return summary;
}

function formatOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    const apiMessage = error.message;
    const status = error.status;

    if (status === 401) return apiMessage || "API Key 无效或未授权，请检查密钥。";
    if (status === 403) return apiMessage || "访问被拒绝，请检查 API Key 权限。";
    if (status === 404) return apiMessage || "接口地址不存在，请检查 OpenAI Base URL 是否正确。";
    if (status === 429) return apiMessage || "请求过于频繁或额度不足，请稍后再试。";
    if (status && status >= 500) return apiMessage || "服务端错误，请稍后再试。";

    return apiMessage || `请求失败（HTTP ${status ?? "未知"}）。`;
  }

  if (error instanceof Error) {
    if (/fetch|network|cors/i.test(error.message)) {
      return "网络请求失败。若浏览器控制台出现 CORS 错误，说明该 API 端点不允许浏览器直连，请改用支持 CORS 的代理或后端服务。";
    }
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function createOpenAIClient({ baseURL, apiKey }: ApiCredentials): OpenAI {
  return new OpenAI({
    baseURL: normalizeBaseURL(baseURL),
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

export function extractStreamDelta(chunk: StreamChunkShape | ChatCompletionChunk): StreamDelta {
  const delta = (chunk?.choices?.[0]?.delta ?? {}) as StreamDeltaFields;
  const thinkingField = delta.thinking;

  return {
    reasoning:
      delta.reasoning_content ??
      delta.reasoning ??
      (typeof thinkingField === "string" ? thinkingField : "") ??
      "",
    content: delta.content ?? ""
  };
}

export function extractMessageReasoning(message: CompletionMessageShape | null | undefined): string {
  if (!message || typeof message !== "object") return "";
  return String(message.reasoning_content ?? message.reasoning ?? "").trim();
}

export function buildOpenAIRequestBody({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 16384,
  jsonMode = false,
  thinkingEnabled = false,
  reasoningEffort = "high",
  stream = false
}: BuildOpenAIRequestBodyOptions): OpenAIRequestBody {
  const payload: OpenAIRequestBody = {
    model,
    messages: messages as ChatCompletionMessageParam[],
    temperature,
    max_tokens: maxTokens,
    stream
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  if (thinkingEnabled) {
    payload.thinking = { type: "enabled" };
    payload.reasoning_effort = reasoningEffort as ReasoningEffort;
  }

  return payload;
}

export async function openaiChatCompletion({
  baseURL,
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 16384,
  jsonMode = false,
  thinkingEnabled = false,
  reasoningEffort = "high"
}: LlmChatOptions): Promise<LlmChatResult> {
  const client = createOpenAIClient({ baseURL, apiKey });
  const payload = buildOpenAIRequestBody({
    model,
    messages,
    temperature,
    maxTokens,
    jsonMode,
    thinkingEnabled,
    reasoningEffort
  });

  const completion = await client.chat.completions.create(payload);
  const message = (completion as OpenAI.Chat.Completions.ChatCompletion).choices?.[0]?.message;
  const content = message?.content;
  if (!content) {
    return { ok: false, message: "模型未返回有效内容，请重试。" };
  }
  const reasoning = extractMessageReasoning(message);
  return { ok: true, content, reasoning };
}

export async function openaiChatCompletionStream({
  baseURL,
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 16384,
  jsonMode = false,
  thinkingEnabled = false,
  reasoningEffort = "high",
  onReasoningDelta,
  onContentDelta
}: LlmChatStreamOptions): Promise<LlmChatResult> {
  const client = createOpenAIClient({ baseURL, apiKey });
  const payload = buildOpenAIRequestBody({
    model,
    messages,
    temperature,
    maxTokens,
    jsonMode,
    thinkingEnabled,
    reasoningEffort,
    stream: true
  });

  const stream = (await client.chat.completions.create(payload)) as AsyncIterable<ChatCompletionChunk>;
  let reasoning = "";
  let content = "";

  for await (const chunk of stream) {
    const delta = extractStreamDelta(chunk);
    if (delta.reasoning) {
      reasoning += delta.reasoning;
      onReasoningDelta?.(reasoning, delta.reasoning);
    }
    if (delta.content) {
      content += delta.content;
      onContentDelta?.(content, delta.content);
    }
  }

  if (!content) {
    return { ok: false, message: "模型未返回有效内容，请重试。" };
  }

  return { ok: true, content, reasoning };
}

export async function llmChat(options: LlmChatOptions): Promise<LlmChatResult> {
  try {
    return await openaiChatCompletion(options);
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export async function llmChatStream(options: LlmChatStreamOptions): Promise<LlmChatResult> {
  try {
    return await openaiChatCompletionStream(options);
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export { createOpenAIClient };
