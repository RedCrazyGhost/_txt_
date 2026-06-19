import type { Question } from "./types";
import { hasAnyAttempt } from "./feedback";
import { resolveQuestionBankVersion } from "./normalize";
import type { QuestionBankMeta } from "./wrongQuestions";

export interface PracticeExportSet extends QuestionBankMeta {
  version: "0.0.2" | "0.0.3";
  name: string;
  type: string;
  author: string;
  questions: Question[];
}

function cloneQuestions(questions: Question[]): Question[] {
  return questions.map((question) => JSON.parse(JSON.stringify(question)) as Question);
}

function buildPracticeBankName(name: string | undefined, suffix: string): string {
  const base = (name || "未命名题集").replace(/-(错题|做题记录)$/, "");
  return `${base}-${suffix}`;
}

export function getAttemptedQuestions(questions: Question[]): Question[] {
  return questions.filter((question) => hasAnyAttempt(question));
}

export function buildPracticeRecordSet(meta: QuestionBankMeta, questions: Question[]): PracticeExportSet {
  const cloned = cloneQuestions(questions);
  return {
    version: resolveQuestionBankVersion(cloned),
    name: buildPracticeBankName(meta.name, "做题记录"),
    type: meta.type || "",
    author: meta.author || "",
    questions: cloned
  };
}

export function buildPracticeRecordExportJson(
  meta: QuestionBankMeta,
  questions: Question[]
): string {
  return JSON.stringify(buildPracticeRecordSet(meta, questions), null, 2);
}

export function buildPracticeRecordFilename(name: string | undefined, date = new Date()): string {
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${buildPracticeBankName(name, "做题记录")}-${yyyymmdd}.json`;
}
