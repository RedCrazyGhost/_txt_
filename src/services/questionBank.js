import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync.js";

const LOCAL_BANKS_KEY = "_txt_local_banks";
const REMOTE_BANKS_KEY = "_txt_remote_cache";

function storageKey(source) {
  return source === "remote" ? REMOTE_BANKS_KEY : LOCAL_BANKS_KEY;
}

import { resolveQuestionBankVersion } from "../utils/questions.ts";

function parseQuestions(questionsText) {
  return questionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => [line]);
}

export function persistBanks(source, banks) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(source), JSON.stringify(banks));
  notifyStorageChanged(
    source === "remote" ? StorageChangeKind.remoteBanks : StorageChangeKind.localBanks
  );
}

export function loadBanks(source) {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(source));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createEmptyBankDraft(source) {
  return {
    source,
    title: "",
    subject: "",
    author: "",
    questionsText: ""
  };
}

export function createBank(source, draft) {
  const banks = loadBanks(source);
  const now = new Date().toISOString();
  const next = [
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
  persistBanks(source, next);
  return next;
}

export function updateBank(source, id, draft) {
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
  persistBanks(source, next);
  return next;
}

export function deleteBankById(source, id) {
  const next = loadBanks(source).filter((item) => item.id !== id);
  persistBanks(source, next);
  return next;
}

export function exportBankAsJson(bank) {
  const questions = Array.isArray(bank.questions) ? bank.questions : [];
  return JSON.stringify(
    {
      version: resolveQuestionBankVersion(questions),
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

export function importBanksFromJson(source, payload) {
  const parsed = JSON.parse(payload);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const normalized = list.map((item) => ({
    id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    source,
    title: item.name || item.title || "未命名题库",
    subject: item.type || item.subject || "",
    author: item.author || "",
    updatedAt: new Date().toISOString(),
    questions: Array.isArray(item.questions) ? item.questions : []
  }));
  const next = [...normalized, ...loadBanks(source)];
  persistBanks(source, next);
  return next;
}

export function addBankFromExisting(source, bank) {
  const next = [
    {
      ...bank,
      id: `${source}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source,
      updatedAt: new Date().toISOString()
    },
    ...loadBanks(source)
  ];
  persistBanks(source, next);
  return next;
}

export function createBankFromQuestions(source, payload) {
  const banks = loadBanks(source);
  const next = [
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
  persistBanks(source, next);
  return next;
}

