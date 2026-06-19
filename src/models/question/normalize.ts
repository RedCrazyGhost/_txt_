import { detectSingleChoiceFromFillBlank } from "./detectSingleChoice";
import { finalizeQuestionReactivity } from "./reactivity";
import type {
  ChoiceQuestion,
  FillBlankQuestion,
  Question,
  QuestionType,
  SingleChoiceQuestion
} from "./types";

function resolveQuestionType(raw: Record<string, unknown>): QuestionType | undefined {
  const rawType = raw.questionType;
  if (rawType === "multiChoice") return "multipleChoice";
  if (rawType === "trueFalse") return "judgment";
  if (typeof rawType === "string") return rawType as QuestionType;
  return undefined;
}
const SUPPORTED_TYPES: QuestionType[] = [
  "fillBlank",
  "singleChoice",
  "multipleChoice",
  "judgment",
  "subjective"
];

function normalizeResults(
  answers: string[][],
  results: unknown
): Array<string | undefined> {
  const slotCount = answers.length;
  if (Array.isArray(results) && results.length === slotCount) {
    return results as Array<string | undefined>;
  }
  return new Array<string | undefined>(slotCount);
}

function normalizeFillBlank(raw: Record<string, unknown>): FillBlankQuestion {
  const answers = Array.isArray(raw.answers)
    ? (raw.answers as string[][]).map((slot) => (Array.isArray(slot) ? slot : []))
    : [];

  const question: FillBlankQuestion = {
    texts: Array.isArray(raw.texts)
      ? (raw.texts as string[])
      : [String(raw.texts ?? "")],
    answers,
    answerslength: Array.isArray(raw.answerslength) ? (raw.answerslength as number[]) : [],
    results: normalizeResults(answers, raw.results),
    MD5: Boolean(raw.MD5),
    image: typeof raw.image === "string" ? raw.image : "",
    explanation: typeof raw.explanation === "string" ? raw.explanation : undefined
  };

  if (raw.questionType === "fillBlank") {
    question.questionType = "fillBlank";
  }

  return question;
}

function normalizeChoiceQuestion(
  raw: Record<string, unknown>,
  questionType: "singleChoice" | "multipleChoice" | "judgment"
): ChoiceQuestion {
  const answers = Array.isArray(raw.answers)
    ? (raw.answers as string[][]).map((slot) => (Array.isArray(slot) ? slot : []))
    : [[]];

  const options = Array.isArray(raw.options)
    ? (raw.options as Array<{ key?: string; text?: string }>)
        .filter((item) => item && typeof item.key === "string")
        .map((item) => ({
          key: item.key as string,
          text: typeof item.text === "string" ? item.text : ""
        }))
    : [];

  return {
    questionType,
    stem: typeof raw.stem === "string" ? raw.stem : "",
    options,
    answers,
    results: normalizeResults(answers, raw.results),
    MD5: Boolean(raw.MD5),
    image: typeof raw.image === "string" ? raw.image : "",
    explanation: typeof raw.explanation === "string" ? raw.explanation : undefined
  };
}

function normalizeSingleChoice(raw: Record<string, unknown>): SingleChoiceQuestion {
  return normalizeChoiceQuestion(raw, "singleChoice") as SingleChoiceQuestion;
}

function normalizeLegacy(raw: unknown): FillBlankQuestion {
  if (typeof raw === "string") {
    return {
      texts: [raw],
      answers: [],
      answerslength: [],
      results: [],
      MD5: false,
      image: ""
    };
  }

  if (Array.isArray(raw)) {
    return {
      texts: [raw.map(String).join(" ")],
      answers: [],
      answerslength: [],
      results: [],
      MD5: false,
      image: ""
    };
  }

  return normalizeFillBlank({});
}

export function normalizeQuestion(raw: unknown): Question {
  if (typeof raw === "string" || Array.isArray(raw)) {
    return normalizeLegacy(raw);
  }

  if (!raw || typeof raw !== "object") {
    return normalizeLegacy(raw);
  }

  const record = raw as Record<string, unknown>;
  const questionType = resolveQuestionType(record);

  if (questionType && !SUPPORTED_TYPES.includes(questionType)) {
    console.warn(`Unknown questionType "${questionType}", falling back to fillBlank.`);
    return normalizeFillBlank(record);
  }

  if (questionType === "singleChoice") {
    return normalizeSingleChoice(record);
  }

  if (questionType === "multipleChoice") {
    return normalizeChoiceQuestion(record, "multipleChoice") as Question;
  }

  if (questionType === "judgment") {
    return normalizeChoiceQuestion(record, "judgment") as Question;
  }

  if (questionType === "subjective") {
    console.warn(`questionType "${questionType}" is not implemented yet, falling back to fillBlank.`);
    return normalizeFillBlank(record);
  }

  return normalizeFillBlank(record);
}

/** 练习/预览时将伪填空选择题提升为 singleChoice（不写回 JSON 文件） */
export function normalizeQuestionWithDetection(raw: unknown): Question {
  const normalized = normalizeQuestion(raw);
  let result: Question;
  if (normalized.questionType === "singleChoice") {
    result = normalized;
  } else if (isFillBlankCandidate(normalized)) {
    const detected = detectSingleChoiceFromFillBlank(normalized);
    result = detected ?? normalized;
  } else {
    result = normalized;
  }
  return finalizeQuestionReactivity(result);
}

function isFillBlankCandidate(question: Question): question is FillBlankQuestion {
  return !question.questionType && Array.isArray((question as FillBlankQuestion).texts);
}

export function resolveQuestionBankVersion(questions: unknown[]): "0.0.2" | "0.0.3" {
  return usesExtendedQuestionSchema(questions) ? "0.0.3" : "0.0.2";
}

export function usesExtendedQuestionSchema(questions: unknown[]): boolean {
  if (!Array.isArray(questions)) return false;

  return questions.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    const questionType = resolveQuestionType(record);
    if (questionType && questionType !== "fillBlank") return true;
    if (typeof record.stem === "string" && record.stem.length > 0) return true;
    return Array.isArray(record.options) && record.options.length > 0;
  });
}
