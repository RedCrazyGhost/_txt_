import { txtCharNumber } from "../../utils/questions.ts";
import { llmChat, llmChatStream } from "./llmClient.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

const TXT_PATTERN = /\_.*?\_/g;
const ANSWER_MASK = "____";

export function maskTxtAnswers(txt) {
  return String(txt ?? "").replace(TXT_PATTERN, ANSWER_MASK);
}

export function formatQuestionText(txt, showAnswers = false) {
  const raw = typeof txt === "string" ? txt.trim() : "";
  return showAnswers ? raw : maskTxtAnswers(raw);
}

export function formatQuestionsForDisplay(questions, showAnswers = false) {
  if (!Array.isArray(questions) || !questions.length) return "";

  return questions
    .map((item, index) => `${index + 1}. ${formatQuestionText(item?.txt, showAnswers)}`)
    .join("\n\n");
}

export function isValidTxtLine(txt) {
  const value = String(txt ?? "").trim();
  if (!value) return false;
  if (txtCharNumber(value, "_") % 2 !== 0) return false;
  return value.match(TXT_PATTERN) !== null;
}

export function stripMarkdownCodeFence(text) {
  let value = String(text ?? "").trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    value = fenced[1].trim();
  }
  return value;
}

export function parseGenerationJson(rawText) {
  const cleaned = stripMarkdownCodeFence(rawText);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function normalizeGenerationPayload(raw) {
  if (!raw || typeof raw !== "object") return null;

  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .map((item) => ({
          txt: typeof item?.txt === "string" ? item.txt.trim() : "",
          answer: typeof item?.answer === "string" ? item.answer.trim() : "",
          explanation: typeof item?.explanation === "string" ? item.explanation.trim() : ""
        }))
        .filter((item) => item.txt)
    : [];

  return {
    name: String(raw.name ?? "").trim(),
    type: String(raw.type ?? "").trim(),
    author: String(raw.author ?? "").trim(),
    questions
  };
}

export function filterValidQuestions(questions) {
  const valid = [];
  let invalidCount = 0;

  questions.forEach((item) => {
    if (isValidTxtLine(item.txt)) {
      valid.push({
        txt: item.txt.trim(),
        answer: String(item.answer ?? "").trim(),
        explanation: String(item.explanation ?? "").trim()
      });
    } else {
      invalidCount += 1;
    }
  });

  return { valid, invalidCount };
}

export function processGenerationResult(rawText) {
  const parsed = parseGenerationJson(rawText);
  if (!parsed) {
    return { ok: false, message: "无法解析模型返回的 JSON，请重试。" };
  }

  const normalized = normalizeGenerationPayload(parsed);
  if (!normalized || !normalized.questions.length) {
    return { ok: false, message: "模型返回的数据中没有有效题目。" };
  }

  const { valid, invalidCount } = filterValidQuestions(normalized.questions);
  if (!valid.length) {
    return {
      ok: false,
      invalidCount,
      message: "生成的题目均不符合 _txt_ 格式，请调整提示后重试。"
    };
  }

  return {
    ok: true,
    data: {
      name: normalized.name,
      type: normalized.type,
      author: normalized.author,
      questions: valid
    },
    invalidCount,
    message:
      invalidCount > 0
        ? `已过滤 ${invalidCount} 道格式无效的题目，保留 ${valid.length} 道。`
        : `成功生成 ${valid.length} 道题目。`
  };
}

async function requestGenerationCompletion({ config, messages, onReasoningDelta, onContentDelta }) {
  const chatOptions = {
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    thinkingEnabled: config.thinkingEnabled,
    reasoningEffort: config.reasoningEffort,
    jsonMode: true,
    messages
  };

  if (config.thinkingEnabled && (onReasoningDelta || onContentDelta)) {
    return llmChatStream({
      ...chatOptions,
      onReasoningDelta,
      onContentDelta
    });
  }

  return llmChat(chatOptions);
}

export async function generateQuestionsFromAi(options) {
  const { prompt, config, references, onReasoningDelta, onContentDelta } = options;

  const trimmedPrompt = String(prompt ?? "").trim();
  if (!trimmedPrompt) {
    return { ok: false, message: "请输入生成要求。" };
  }

  if (!config?.apiKey?.trim()) {
    return { ok: false, message: "请填写 API Key。" };
  }

  const referenceList = Array.isArray(references) ? references : [];

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(trimmedPrompt, referenceList);

  const completion = await requestGenerationCompletion({
    config,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    onReasoningDelta,
    onContentDelta
  });

  if (!completion.ok) {
    return { ok: false, message: completion.message };
  }

  const result = processGenerationResult(completion.content);
  if (result.ok && completion.reasoning) {
    result.reasoning = completion.reasoning;
  }
  return result;
}
