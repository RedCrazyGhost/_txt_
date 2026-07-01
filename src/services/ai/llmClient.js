import OpenAI from "openai";

function normalizeBaseURL(baseURL) {
  return String(baseURL || "").trim().replace(/\/+$/, "");
}

export function isDeepSeekBaseURL(baseURL) {
  return /deepseek\.com/i.test(String(baseURL || ""));
}

function buildApiUrl(baseURL, path) {
  const base = normalizeBaseURL(baseURL);
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `${base}${segment}`;
}

async function authorizedApiFetch({ baseURL, apiKey, path }) {
  const response = await fetch(buildApiUrl(baseURL, path), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      (response.status === 401
        ? "API Key 无效或未授权，请检查密钥。"
        : response.status === 404
          ? "接口地址不存在，请检查 Base URL 是否正确。"
          : `请求失败（HTTP ${response.status}）。`);
    return { ok: false, message };
  }

  return { ok: true, data: body };
}

export async function fetchModelsList({ baseURL, apiKey }) {
  if (!String(baseURL || "").trim()) {
    return { ok: false, message: "请填写 Base URL。" };
  }
  if (!String(apiKey || "").trim()) {
    return { ok: false, message: "请填写 API Key。" };
  }

  try {
    const result = await authorizedApiFetch({ baseURL, apiKey, path: "/models" });
    if (!result.ok) return result;

    const models = Array.isArray(result.data?.data)
      ? result.data.data
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

export async function fetchUserBalance({ baseURL, apiKey }) {
  if (!String(baseURL || "").trim()) {
    return { ok: false, message: "请填写 Base URL。" };
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

export function formatBalanceInfo(data) {
  if (!data || typeof data !== "object") return "";

  const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
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
  if (data.is_available === false) {
    summary += " · 当前余额不可用";
  }
  return summary;
}

function formatOpenAIError(error) {
  if (error instanceof OpenAI.APIError) {
    const apiMessage = error.message;
    const status = error.status;

    if (status === 401) return apiMessage || "API Key 无效或未授权，请检查密钥。";
    if (status === 403) return apiMessage || "访问被拒绝，请检查 API Key 权限。";
    if (status === 404) return apiMessage || "接口地址不存在，请检查 Base URL 是否正确。";
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

function createOpenAIClient({ baseURL, apiKey }) {
  return new OpenAI({
    baseURL: normalizeBaseURL(baseURL),
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

export function extractStreamDelta(chunk) {
  const delta = chunk?.choices?.[0]?.delta ?? {};
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

export function extractMessageReasoning(message) {
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
}) {
  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  if (thinkingEnabled) {
    payload.thinking = { type: "enabled" };
    payload.reasoning_effort = reasoningEffort;
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
}) {
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
  const message = completion.choices?.[0]?.message;
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
}) {
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

  const stream = await client.chat.completions.create(payload);
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

export async function llmChat(options) {
  try {
    return await openaiChatCompletion(options);
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export async function llmChatStream(options) {
  try {
    return await openaiChatCompletionStream(options);
  } catch (error) {
    return { ok: false, message: formatOpenAIError(error) };
  }
}

export { createOpenAIClient };
