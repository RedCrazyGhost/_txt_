import type { Question } from "../models/question/types";
import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync";

const LOCAL_BANKS_KEY = "_txt_local_banks";
const REMOTE_BANKS_KEY = "_txt_remote_cache";

export const STORAGE_QUOTA_EXCEEDED_MESSAGE =
  "浏览器存储空间不足，无法保存。请清理本地题库或远程缓存后重试。";

export type BankSource = "local" | "remote";

export interface Bank {
  id: string;
  source: BankSource;
  title: string;
  subject: string;
  author: string;
  updatedAt: string;
  questions: Question[] | string[][];
}

export interface BankDraft {
  title: string;
  subject: string;
  author: string;
  questionsText: string;
}

export interface CreateBankFromQuestionsPayload {
  title?: string;
  subject?: string;
  author?: string;
  questions?: Question[];
}

export interface PersistBanksOk {
  ok: true;
}

export interface PersistBanksFail {
  ok: false;
  message: string;
}

export type PersistBanksResult = PersistBanksOk | PersistBanksFail;

export interface CommitBanksOk {
  ok: true;
  banks: Bank[];
}

export interface CommitBanksFail {
  ok: false;
  message: string;
  banks: Bank[];
}

export type CommitBanksResult = CommitBanksOk | CommitBanksFail;

function storageKey(source: BankSource): string {
  return source === "remote" ? REMOTE_BANKS_KEY : LOCAL_BANKS_KEY;
}

import { resolveQuestionBankVersion } from "../utils/questions";

function parseQuestions(questionsText: string): string[][] {
  return questionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => [line]);
}

function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: number };
  return e.name === "QuotaExceededError" || e.code === 22;
}

function commitBanks(source: BankSource, banks: Bank[]): CommitBanksResult {
  const persisted = persistBanks(source, banks);
  if (!persisted.ok) {
    return { ok: false, message: persisted.message, banks: loadBanks(source) };
  }
  return { ok: true, banks };
}

export function persistBanks(source: BankSource, banks: Bank[]): PersistBanksResult {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(storageKey(source), JSON.stringify(banks));
    notifyStorageChanged(
      source === "remote" ? StorageChangeKind.remoteBanks : StorageChangeKind.localBanks
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: isQuotaExceededError(error)
        ? STORAGE_QUOTA_EXCEEDED_MESSAGE
        : "写入浏览器存储失败，请稍后重试。"
    };
  }
}

export function loadBanks(source: BankSource): Bank[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(source));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Bank[]) : [];
  } catch {
    return [];
  }
}

export function createEmptyBankDraft(source: BankSource): BankDraft & { source: BankSource } {
  return {
    source,
    title: "",
    subject: "",
    author: "",
    questionsText: ""
  };
}

export function createBank(source: BankSource, draft: BankDraft): CommitBanksResult {
  const banks = loadBanks(source);
  const now = new Date().toISOString();
  const next: Bank[] = [
    {
      id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      author: draft.author.trim(),
      updatedAt: now,
      questions: parseQuestions(draft.questionsText)
    },
    ...banks
  ];
  return commitBanks(source, next);
}

export function updateBank(source: BankSource, id: string, draft: BankDraft): CommitBanksResult {
  const banks = loadBanks(source);
  const next = banks.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      author: draft.author.trim(),
      updatedAt: new Date().toISOString(),
      questions: parseQuestions(draft.questionsText)
    };
  });
  return commitBanks(source, next);
}

/** Update bank metadata only; keep existing questions. */
export function updateBankMeta(
  source: BankSource,
  id: string,
  meta: Pick<BankDraft, "title" | "subject" | "author">
): CommitBanksResult {
  const banks = loadBanks(source);
  const next = banks.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      title: meta.title.trim(),
      subject: meta.subject.trim(),
      author: meta.author.trim(),
      updatedAt: new Date().toISOString()
    };
  });
  return commitBanks(source, next);
}

export function deleteBankById(source: BankSource, id: string): CommitBanksResult {
  const next = loadBanks(source).filter((item) => item.id !== id);
  return commitBanks(source, next);
}

export function exportBankAsJson(bank: Bank): string {
  const questions = Array.isArray(bank.questions) ? bank.questions : [];
  return JSON.stringify(
    {
      version: resolveQuestionBankVersion(questions as Question[]),
      name: bank.title,
      type: bank.subject,
      author: bank.author,
      source: bank.source,
      updatedAt: bank.updatedAt,
      questions
    },
    null,
    2
  );
}

interface ImportedBankItem {
  name?: string;
  title?: string;
  type?: string;
  subject?: string;
  author?: string;
  questions?: Question[];
}

function normalizeImportedBankItem(item: unknown): ImportedBankItem {
  if (!item || typeof item !== "object") return {};
  return item as ImportedBankItem;
}

export function importBanksFromJson(source: BankSource, payload: string): CommitBanksResult {
  const parsed: unknown = JSON.parse(payload);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const normalized: Bank[] = list.map((item) => {
    const bank = normalizeImportedBankItem(item);
    return {
      id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source,
      title: bank.name || bank.title || "未命名题库",
      subject: bank.type || bank.subject || "",
      author: bank.author || "",
      updatedAt: new Date().toISOString(),
      questions: Array.isArray(bank.questions) ? bank.questions : []
    };
  });
  const next = [...normalized, ...loadBanks(source)];
  return commitBanks(source, next);
}

export function addBankFromExisting(source: BankSource, bank: Bank): CommitBanksResult {
  const next: Bank[] = [
    {
      ...bank,
      id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source,
      updatedAt: new Date().toISOString()
    },
    ...loadBanks(source)
  ];
  return commitBanks(source, next);
}

export function createBankFromQuestions(
  source: BankSource,
  payload: CreateBankFromQuestionsPayload
): CommitBanksResult {
  const banks = loadBanks(source);
  const next: Bank[] = [
    {
      id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source,
      title: (payload.title || "").trim() || "未命名题库",
      subject: (payload.subject || "").trim(),
      author: (payload.author || "").trim(),
      updatedAt: new Date().toISOString(),
      questions: Array.isArray(payload.questions) ? payload.questions : []
    },
    ...banks
  ];
  return commitBanks(source, next);
}

/** Replace questions while keeping bank id (progress key stable). */
export function updateBankFromQuestions(
  source: BankSource,
  id: string,
  payload: CreateBankFromQuestionsPayload
): CommitBanksResult {
  const banks = loadBanks(source);
  const found = banks.some((item) => item.id === id);
  if (!found) {
    return { ok: false, message: "未找到要更新的题集。", banks };
  }
  const next = banks.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      title: (payload.title || "").trim() || item.title || "未命名题库",
      subject: (payload.subject ?? item.subject ?? "").trim(),
      author: (payload.author ?? item.author ?? "").trim(),
      updatedAt: new Date().toISOString(),
      questions: Array.isArray(payload.questions) ? payload.questions : item.questions
    };
  });
  return commitBanks(source, next);
}
