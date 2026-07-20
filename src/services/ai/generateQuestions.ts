import { txtCharNumber } from "../../utils/questions";
import type { AiConfigInput } from "./aiConfigStorage";
import { resolveAiConfig } from "./aiConfigStorage";
import type { LlmChatResult } from "./llmClient";
import { llmChat, llmChatStream } from "./llmClient";
import type { ChatMessage } from "./prompts";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import type { ReferenceFile } from "./referenceFile";

const TXT_PATTERN = /\_.*?\_/g;
const ANSWER_MASK = "____";

export interface GeneratedQuestion {
  txt: string;
  answer: string;
  explanation: string;
}

export interface GenerationPayload {
  name: string;
  type: string;
  author: string;
  questions: GeneratedQuestion[];
}

export type ProcessGenerationSuccess = {
  ok: true;
  data: GenerationPayload;
  invalidCount: number;
  message: string;
  reasoning?: string;
};

export type ProcessGenerationFailure = {
  ok: false;
  message: string;
  invalidCount?: number;
};

export type ProcessGenerationResult = ProcessGenerationSuccess | ProcessGenerationFailure;

export type GenerateQuestionsResult = ProcessGenerationResult;

export interface GenerateQuestionsOptions {
  prompt: unknown;
  config: AiConfigInput;
  references?: ReferenceFile[];
  onReasoningDelta?: (fullReasoning: string, delta: string) => void;
  onContentDelta?: (fullContent: string, delta: string) => void;
}

interface RequestGenerationCompletionOptions {
  config: AiConfigInput;
  messages: ChatMessage[];
  onReasoningDelta?: (fullReasoning: string, delta: string) => void;
  onContentDelta?: (fullContent: string, delta: string) => void;
}

export function maskTxtAnswers(txt: unknown): string {
  return String(txt ?? "").replace(TXT_PATTERN, ANSWER_MASK);
}

export function formatQuestionText(txt: unknown, showAnswers = false): string {
  const raw = typeof txt === "string" ? txt.trim() : "";
  return showAnswers ? raw : maskTxtAnswers(raw);
}

export function formatQuestionsForDisplay(
  questions: Array<{ txt?: string }> | unknown,
  showAnswers = false
): string {
  if (!Array.isArray(questions) || !questions.length) return "";

  return questions
    .map((item, index) => `${index + 1}. ${formatQuestionText(item?.txt, showAnswers)}`)
    .join("\n\n");
}

export function isValidTxtLine(txt: unknown): boolean {
  const value = String(txt ?? "").trim();
  if (!value) return false;
  if (txtCharNumber(value, "_") % 2 !== 0) return false;
  return value.match(TXT_PATTERN) !== null;
}

export function stripMarkdownCodeFence(text: unknown): string {
  let value = String(text ?? "").trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    value = fenced[1].trim();
  }
  return value;
}

export function parseGenerationJson(rawText: unknown): unknown {
  const cleaned = stripMarkdownCodeFence(rawText);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function normalizeGenerationPayload(raw: unknown): GenerationPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const questions = Array.isArray(record.questions)
    ? record.questions
        .map((item) => {
          const question = item as Record<string, unknown>;
          return {
            txt: typeof question?.txt === "string" ? question.txt.trim() : "",
            answer: typeof question?.answer === "string" ? question.answer.trim() : "",
            explanation:
              typeof question?.explanation === "string" ? question.explanation.trim() : ""
          };
        })
        .filter((item) => item.txt)
    : [];

  return {
    name: String(record.name ?? "").trim(),
    type: String(record.type ?? "").trim(),
    author: String(record.author ?? "").trim(),
    questions
  };
}

export function filterValidQuestions(questions: GeneratedQuestion[]): {
  valid: GeneratedQuestion[];
  invalidCount: number;
} {
  const valid: GeneratedQuestion[] = [];
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

export function processGenerationResult(rawText: unknown): ProcessGenerationResult {
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

async function requestGenerationCompletion({
  config,
  messages,
  onReasoningDelta,
  onContentDelta
}: RequestGenerationCompletionOptions): Promise<LlmChatResult> {
  const resolved = resolveAiConfig(config);
  const chatOptions = {
    baseURL: resolved.baseURL,
    apiKey: resolved.apiKey,
    model: resolved.model,
    temperature: resolved.temperature,
    maxTokens: resolved.maxTokens,
    thinkingEnabled: resolved.thinkingEnabled,
    reasoningEffort: resolved.reasoningEffort,
    jsonMode: true,
    messages
  };

  if (resolved.thinkingEnabled && (onReasoningDelta || onContentDelta)) {
    return llmChatStream({
      ...chatOptions,
      onReasoningDelta,
      onContentDelta
    });
  }

  return llmChat(chatOptions);
}

export async function generateQuestionsFromAi(
  options: GenerateQuestionsOptions
): Promise<GenerateQuestionsResult> {
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
