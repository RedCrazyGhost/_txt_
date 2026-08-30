import type { Question } from "./types";
import { hasAnyPartialAttempt, hasAnyWrongAttempt } from "./feedback";
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

export interface WrongQuestionsOptions {
  includePartial?: boolean;
  clearResults?: boolean;
}

export function getStrictWrongQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => hasAnyWrongAttempt(question));
}

export function getWrongQuestionsIncludingPartial(questions: Question[]): Question[] {
  return questions.filter(
    (question) => hasAnyWrongAttempt(question) || hasAnyPartialAttempt(question)
  );
}

/** @deprecated Use getStrictWrongQuestions */
export function getWrongQuestions(questions: Question[]): Question[] {
  return getStrictWrongQuestions(questions);
}

function filterWrongQuestions(questions: Question[], includePartial: boolean): Question[] {
  return includePartial
    ? getWrongQuestionsIncludingPartial(questions)
    : getStrictWrongQuestions(questions);
}

export function cloneQuestionWithEmptyResults(question: Question): Question {
  const slotCount = getAnswerSlotCount(question);
  const clone = JSON.parse(JSON.stringify(question)) as Question;
  clone.results = Array.from({ length: slotCount }, () => undefined);
  return clone;
}

export function stripWrongBankSuffix(name: string | undefined): string {
  return (name || "未命名题集")
    .replace(/-错题含半对$/, "")
    .replace(/-错题$/, "");
}

function buildWrongBankName(name: string | undefined, includePartial: boolean): string {
  const base = stripWrongBankSuffix(name);
  return includePartial ? `${base}-错题含半对` : `${base}-错题`;
}

export function buildWrongQuestionsSet(
  meta: QuestionBankMeta,
  questions: Question[],
  options: WrongQuestionsOptions = {}
): WrongQuestionsSet {
  const { includePartial = false, clearResults = false } = options;
  const filtered = filterWrongQuestions(questions, includePartial);
  const wrongQuestions = clearResults
    ? filtered.map(cloneQuestionWithEmptyResults)
    : filtered.map((question) => JSON.parse(JSON.stringify(question)) as Question);

  return {
    version: resolveQuestionBankVersion(wrongQuestions),
    name: buildWrongBankName(meta.name, includePartial),
    type: meta.type || "",
    author: meta.author || "",
    questions: wrongQuestions
  };
}

export function buildWrongQuestionsExportJson(
  meta: QuestionBankMeta,
  questions: Question[],
  options: WrongQuestionsOptions = {}
): string {
  return JSON.stringify(buildWrongQuestionsSet(meta, questions, options), null, 2);
}

export function buildWrongQuestionsFilename(
  name: string | undefined,
  options: { includePartial?: boolean; date?: Date } = {}
): string {
  const { includePartial = false, date = new Date() } = options;
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${buildWrongBankName(name, includePartial)}-${yyyymmdd}.json`;
}
