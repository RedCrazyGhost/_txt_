import type { Question } from "./types";
import { hasAnyWrongAttempt } from "./feedback";
import { getAnswerSlotCount } from "../../utils/questions";
import { resolveQuestionBankVersion } from "./normalize";

export interface QuestionBankMeta {
  name?: string;
  type?: string;
  author?: string;
  version?: string;
}

export interface WrongQuestionsSet extends QuestionBankMeta {
  version: "0.0.2" | "0.0.3";
  name: string;
  type: string;
  author: string;
  questions: Question[];
}

export function getWrongQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => hasAnyWrongAttempt(question));
}

export function cloneQuestionWithEmptyResults(question: Question): Question {
  const slotCount = getAnswerSlotCount(question);
  const clone = JSON.parse(JSON.stringify(question)) as Question;
  clone.results = Array.from({ length: slotCount }, () => undefined);
  return clone;
}

function buildWrongBankName(name: string | undefined): string {
  const base = (name || "未命名题集").replace(/-错题$/, "");
  return `${base}-错题`;
}

export function buildWrongQuestionsSet(
  meta: QuestionBankMeta,
  questions: Question[],
  options: { clearResults?: boolean } = {}
): WrongQuestionsSet {
  const filtered = getWrongQuestions(questions);
  const wrongQuestions = options.clearResults
    ? filtered.map(cloneQuestionWithEmptyResults)
    : filtered.map((question) => JSON.parse(JSON.stringify(question)) as Question);

  return {
    version: resolveQuestionBankVersion(wrongQuestions),
    name: buildWrongBankName(meta.name),
    type: meta.type || "",
    author: meta.author || "",
    questions: wrongQuestions
  };
}

export function buildWrongQuestionsExportJson(
  meta: QuestionBankMeta,
  questions: Question[]
): string {
  return JSON.stringify(buildWrongQuestionsSet(meta, questions), null, 2);
}

export function buildWrongQuestionsFilename(name: string | undefined, date = new Date()): string {
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${buildWrongBankName(name)}-${yyyymmdd}.json`;
}
