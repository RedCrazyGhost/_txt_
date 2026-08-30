import type { Question } from "../models/question/types";

export const QUESTION_JSON_VERSION = "0.0.2";

export type SaveTarget = "browser" | "file";

export interface LocalBankDraft {
  title: string;
  subject: string;
  author: string;
}

export interface ImportedQuestionJson {
  version: string;
  name: string;
  type: string;
  author: string;
  questions: Question[];
}

export function normalizeImportedQuestionJson(
  raw: Partial<ImportedQuestionJson> | null | undefined
): ImportedQuestionJson {
  return {
    version: QUESTION_JSON_VERSION,
    name: raw?.name || "",
    type: raw?.type || "",
    author: raw?.author || "",
    questions: Array.isArray(raw?.questions) ? raw.questions : []
  };
}

export function formatYyyymmdd(date: Date = new Date()): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

export function buildQuestionJsonExportFilename(meta: {
  name?: string;
  type?: string;
  author?: string;
  date?: Date;
}): string {
  const name = meta.name || "未命名题集";
  const type = meta.type || "未分类";
  const author = meta.author || "佚名";
  return `${name}-${type}-${author}-${formatYyyymmdd(meta.date)}.json`;
}

export function ensureJsonFilename(filename: string, fallback: string): string {
  const normalized = filename.trim() || fallback;
  return normalized.endsWith(".json") ? normalized : `${normalized}.json`;
}

export function buildQuestionJsonPreviewPayload(meta: {
  version: string;
  name: string;
  type: string;
  author: string;
  questions: Question[];
}): {
  version: string;
  name: string;
  type: string;
  author: string;
  questions: Question[];
} {
  const questions = meta.questions.map((q) =>
    q.image !== "" ? { ...q, image: "因数据过大，不予显示" } : q
  );
  return {
    version: meta.version,
    name: meta.name || "",
    type: meta.type || "",
    author: meta.author || "",
    questions
  };
}
