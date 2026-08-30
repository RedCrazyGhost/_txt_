import type { Question } from "../models/question/types";
import type { TxtEntry } from "../state/appState";
import { resolveQuestionBankVersion } from "../utils/questions";
import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync";
import { APP_STORAGE_KEYS } from "./browserStorage";

export const STORAGE_QUOTA_EXCEEDED_MESSAGE =
  "浏览器存储空间不足，无法保存。请清理本地题库或远程缓存后重试。";

export type BankSource = "local" | "remote";
export type BankStatus = "draft" | "published";

export interface Bank {
  id: string;
  source: BankSource;
  title: string;
  subject: string;
  author: string;
  updatedAt: string;
  questions: Question[] | string[][];
  status?: BankStatus;
  /** 编辑器草稿：未发布前的 txt 录入层 */
  editorTxts?: TxtEntry[];
}

export function isDraftBank(bank: Pick<Bank, "status">): boolean {
  return bank.status === "draft";
}

export function isPublishedBank(bank: Pick<Bank, "status">): boolean {
  return bank.status !== "draft";
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

export interface EditorDraftPayload {
  id?: string;
  title?: string;
  subject?: string;
  author?: string;
  questions?: Question[];
  editorTxts?: TxtEntry[];
}

export type UpsertEditorDraftResult = CommitBanksResult & {
  bankId?: string;
  skipped?: boolean;
};

export type PublishBankResult = CommitBanksResult & {
  bankId?: string;
};

function hasEditorTxtContent(txts: TxtEntry[] | undefined): boolean {
  if (!txts?.length) return false;
  return txts.some(
    (entry) =>
      entry.txt.trim() ||
      entry.image.trim() ||
      Boolean(entry.explanation?.trim())
  );
}

/** 无 meta、无题目、无 txt 内容时视为空草稿，不应写入存储。 */
export function isEmptyEditorDraft(payload: EditorDraftPayload): boolean {
  const hasMeta = Boolean(
    (payload.title || "").trim() ||
      (payload.subject || "").trim() ||
      (payload.author || "").trim()
  );
  const hasQuestions = Array.isArray(payload.questions) && payload.questions.length > 0;
  return !hasMeta && !hasQuestions && !hasEditorTxtContent(payload.editorTxts);
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
  return source === "remote" ? APP_STORAGE_KEYS.remoteBanks : APP_STORAGE_KEYS.localBanks;
}

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
      questions: Array.isArray(payload.questions) ? payload.questions : [],
      status: "published"
    },
    ...banks
  ];
  return commitBanks(source, next);
}

/** 编辑器自动保存：创建或更新草稿（含 txt + JSON）。 */
export function upsertEditorDraft(
  source: BankSource,
  payload: EditorDraftPayload
): UpsertEditorDraftResult {
  if (isEmptyEditorDraft(payload)) {
    return { ok: true, banks: loadBanks(source), skipped: true };
  }

  const banks = loadBanks(source);
  const now = new Date().toISOString();
  const title = (payload.title || "").trim() || "未命名题集";
  const subject = (payload.subject || "").trim();
  const author = (payload.author || "").trim();
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const editorTxts = payload.editorTxts;

  if (payload.id) {
    const index = banks.findIndex((item) => item.id === payload.id);
    if (index >= 0) {
      const existing = banks[index];
      const status: BankStatus = isDraftBank(existing) ? "draft" : "published";
      const next = [...banks];
      next[index] = {
        ...existing,
        title,
        subject,
        author,
        questions,
        editorTxts,
        status,
        updatedAt: now
      };
      const result = commitBanks(source, next);
      return { ...result, bankId: payload.id };
    }
    return {
      ok: false,
      message: "未找到要更新的题集。",
      banks,
      bankId: payload.id
    };
  }

  const bankId = `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const next: Bank[] = [
    {
      id: bankId,
      source,
      title,
      subject,
      author,
      updatedAt: now,
      questions,
      editorTxts,
      status: "draft"
    },
    ...banks
  ];
  const result = commitBanks(source, next);
  return { ...result, bankId };
}

const EMPTY_PUBLISH_MESSAGE = "当前没有可保存的题目，请先生成或导入。";

export const LOCAL_BANK_ALREADY_EXISTS_MESSAGE =
  "当前题集已在本地题库，不会覆盖原有内容。";

/** 显式发布题集：写入 questions，清除 editorTxts，标记 published。 */
export function publishBankFromQuestions(
  source: BankSource,
  id: string | null | undefined,
  payload: CreateBankFromQuestionsPayload
): PublishBankResult {
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (!questions.length) {
    return {
      ok: false,
      message: EMPTY_PUBLISH_MESSAGE,
      banks: loadBanks(source)
    };
  }

  const title = (payload.title || "").trim() || "未命名题库";
  const subject = (payload.subject || "").trim();
  const author = (payload.author || "").trim();
  const now = new Date().toISOString();

  if (id) {
    const banks = loadBanks(source);
    const existing = banks.find((item) => item.id === id);
    if (!existing) {
      return { ok: false, message: "未找到要更新的题集。", banks };
    }
    if (isPublishedBank(existing)) {
      return {
        ok: false,
        message: LOCAL_BANK_ALREADY_EXISTS_MESSAGE,
        banks,
        bankId: id
      };
    }
    const next = banks.map((item) => {
      if (item.id !== id) return item;
      const { editorTxts: _editorTxts, ...rest } = item;
      return {
        ...rest,
        title,
        subject,
        author,
        questions,
        status: "published" as BankStatus,
        updatedAt: now
      };
    });
    const result = commitBanks(source, next);
    return { ...result, bankId: id };
  }

  const bankId = `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const result = commitBanks(source, [
    {
      id: bankId,
      source,
      title,
      subject,
      author,
      updatedAt: now,
      questions,
      status: "published"
    },
    ...loadBanks(source)
  ]);
  return { ...result, bankId };
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
