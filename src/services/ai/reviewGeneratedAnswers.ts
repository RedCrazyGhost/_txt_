import type { AiConfigInput } from "./aiConfigStorage";
import { resolveAiConfig } from "./aiConfigStorage";
import type { GeneratedQuestion } from "./generateQuestions";
import { parseGenerationJson } from "./generateQuestions";
import { llmChat } from "./llmClient";
import { buildAnswerReviewSystemPrompt, buildAnswerReviewUserPrompt } from "./prompts";

export const VERDICTS = Object.freeze(["pass", "fail", "uncertain"] as const);

export type Verdict = (typeof VERDICTS)[number];

const TXT_SLOT_PATTERN = /_(.*?)_/g;

export interface ReviewEntry {
  index: number;
  verdict: Verdict;
  reason: string;
}

export interface ReviewedQuestion extends GeneratedQuestion {
  verdict: Verdict;
  reviewReason: string;
}

export interface ReviewVerdictSummary {
  pass: number;
  fail: number;
  uncertain: number;
  total: number;
}

export interface MergeReviewsOptions {
  fallbackReason?: string;
}

export interface FormatReviewStatusOptions {
  generationMessage?: string;
  reviewFailed?: boolean;
  reviewFailMessage?: string;
}

export type ReviewGeneratedAnswersSuccess = {
  ok: true;
  questions: ReviewedQuestion[];
  reviewFailed: false;
  message: "";
};

export type ReviewGeneratedAnswersFailure = {
  ok: false;
  message: string;
  questions: ReviewedQuestion[];
  reviewFailed?: boolean;
};

export type ReviewGeneratedAnswersResult =
  | ReviewGeneratedAnswersSuccess
  | ReviewGeneratedAnswersFailure;

export interface ReviewGeneratedAnswersOptions {
  questions: GeneratedQuestion[] | unknown;
  config: AiConfigInput;
}

export function normalizeVerdict(value: unknown): Verdict {
  const verdict = String(value ?? "")
    .trim()
    .toLowerCase();
  return VERDICTS.includes(verdict as Verdict) ? (verdict as Verdict) : "uncertain";
}

export function extractTxtAnswerSlots(txt: unknown): string[] {
  const slots: string[] = [];
  const value = String(txt ?? "");
  let match: RegExpExecArray | null;
  TXT_SLOT_PATTERN.lastIndex = 0;
  while ((match = TXT_SLOT_PATTERN.exec(value)) !== null) {
    slots.push(String(match[1] ?? "").trim());
  }
  return slots;
}

function normalizeAnswerToken(token: unknown): string {
  return String(token ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function expandCommaAlternatives(slot: unknown): string[] {
  return String(slot ?? "")
    .split(",")
    .map((part) => normalizeAnswerToken(part))
    .filter(Boolean);
}

/**
 * Check whether the display `answer` field is consistent with `_…_` slots in txt.
 * For multi-slot fill-in, requires every non-empty token in answer to appear in some slot
 * alternative set when answer looks like a summary (single token or letter).
 */
export function isAnswerFieldConsistentWithTxt(txt: unknown, answer: unknown): boolean {
  const slots = extractTxtAnswerSlots(txt);
  const answerText = String(answer ?? "").trim();
  if (!slots.length || !answerText) return true;

  const answerTokens = expandCommaAlternatives(answerText);
  if (!answerTokens.length) return true;

  const slotAltSets = slots.map((slot) => new Set(expandCommaAlternatives(slot)));

  // Single-choice style: answer is a letter that should appear in the first slot.
  if (answerTokens.length === 1 && /^[a-d]$/i.test(answerTokens[0])) {
    return slotAltSets.some((alts) => alts.has(answerTokens[0]));
  }

  // Every answer token must be covered by at least one slot alternative.
  return answerTokens.every((token) => slotAltSets.some((alts) => alts.has(token)));
}

export function parseReviewPayload(rawText: unknown): ReviewEntry[] | null {
  const parsed = parseGenerationJson(rawText);
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const list = Array.isArray(record.reviews) ? record.reviews : null;
  if (!list) return null;

  return list.map((item) => {
    const review = item as Record<string, unknown>;
    return {
      index: Number.isInteger(review?.index) ? (review.index as number) : Number(review?.index),
      verdict: normalizeVerdict(review?.verdict),
      reason: String(review?.reason ?? "").trim()
    };
  });
}

function worseVerdict(a: Verdict, b: Verdict): Verdict {
  const rank: Record<Verdict, number> = { pass: 0, uncertain: 1, fail: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function mergeReviewsOntoQuestions(
  questions: GeneratedQuestion[] | unknown,
  reviews: ReviewEntry[] | unknown,
  options: MergeReviewsOptions = {}
): ReviewedQuestion[] {
  const list = Array.isArray(questions) ? questions : [];
  const reviewList = Array.isArray(reviews) ? reviews : [];
  const fallbackReason = String(options.fallbackReason ?? "未能获得有效复核结果").trim();

  const byIndex = new Map<number, { verdict: Verdict; reason: string }>();
  for (const review of reviewList) {
    if (!Number.isInteger(review.index) || review.index < 0) continue;
    byIndex.set(review.index, {
      verdict: normalizeVerdict(review.verdict),
      reason: String(review.reason ?? "").trim()
    });
  }

  return list.map((question, index) => {
    const fromModel = byIndex.get(index);
    let verdict: Verdict = fromModel?.verdict ?? "uncertain";
    let reviewReason = fromModel?.reason || (fromModel ? "" : fallbackReason);

    if (!isAnswerFieldConsistentWithTxt(question.txt, question.answer)) {
      verdict = worseVerdict(verdict, "uncertain");
      const inconsistencyNote = "answer 字段与 txt 中 _答案_ 不一致";
      reviewReason = reviewReason
        ? `${reviewReason}；${inconsistencyNote}`
        : inconsistencyNote;
    }

    return {
      ...question,
      verdict,
      reviewReason
    };
  });
}

export function summarizeReviewVerdicts(questions: Array<{ verdict?: unknown }> | unknown): ReviewVerdictSummary {
  const summary: ReviewVerdictSummary = { pass: 0, fail: 0, uncertain: 0, total: 0 };
  for (const question of Array.isArray(questions) ? questions : []) {
    const verdict = normalizeVerdict(question?.verdict);
    summary[verdict] += 1;
    summary.total += 1;
  }
  return summary;
}

export function formatReviewStatusMessage(
  summary: ReviewVerdictSummary,
  options: FormatReviewStatusOptions = {}
): string {
  const { generationMessage = "", reviewFailed = false, reviewFailMessage = "" } = options;
  const parts: string[] = [];

  if (generationMessage) parts.push(generationMessage.replace(/。$/, ""));

  if (reviewFailed) {
    parts.push(
      reviewFailMessage
        ? `自动复核失败（${reviewFailMessage}），请人工核对`
        : "自动复核失败，请人工核对"
    );
  } else {
    parts.push(
      `复核通过 ${summary.pass}，不通过 ${summary.fail}，存疑 ${summary.uncertain}`
    );
  }

  parts.push("请勾选题目后，点击「替换 JSON」或「追加 JSON」写入");
  return `${parts.join("；")}。`;
}

export async function reviewGeneratedAnswers({
  questions,
  config
}: ReviewGeneratedAnswersOptions): Promise<ReviewGeneratedAnswersResult> {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) {
    return {
      ok: false,
      message: "没有可复核的题目。",
      questions: []
    };
  }

  if (!config?.apiKey?.trim()) {
    const reviewed = mergeReviewsOntoQuestions(list, [], {
      fallbackReason: "缺少 API Key，无法自动复核"
    });
    return {
      ok: false,
      message: "请填写 API Key。",
      questions: reviewed,
      reviewFailed: true
    };
  }

  const resolved = resolveAiConfig(config);
  const completion = await llmChat({
    baseURL: resolved.baseURL,
    apiKey: resolved.apiKey,
    model: resolved.model,
    temperature: 0.2,
    maxTokens: resolved.maxTokens ?? 8192,
    thinkingEnabled: false,
    jsonMode: true,
    messages: [
      { role: "system", content: buildAnswerReviewSystemPrompt() },
      { role: "user", content: buildAnswerReviewUserPrompt(list) }
    ]
  });

  if (!completion.ok) {
    const reviewed = mergeReviewsOntoQuestions(list, [], {
      fallbackReason: completion.message || "自动复核请求失败"
    });
    return {
      ok: false,
      message: completion.message || "自动复核失败。",
      questions: reviewed,
      reviewFailed: true
    };
  }

  const parsedReviews = parseReviewPayload(completion.content);
  if (!parsedReviews) {
    const reviewed = mergeReviewsOntoQuestions(list, [], {
      fallbackReason: "无法解析复核结果"
    });
    return {
      ok: false,
      message: "无法解析复核结果。",
      questions: reviewed,
      reviewFailed: true
    };
  }

  const reviewed = mergeReviewsOntoQuestions(list, parsedReviews);
  return {
    ok: true,
    questions: reviewed,
    reviewFailed: false,
    message: ""
  };
}
