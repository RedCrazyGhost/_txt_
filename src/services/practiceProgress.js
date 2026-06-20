import { md5 } from "js-md5";
import { createProgressSnapshot } from "../models/question/progress.ts";
import { notifyStorageChanged, StorageChangeKind } from "./appStorageSync.js";

const PROGRESS_KEY = "_txt_practice_progress";
const SCHEMA_VERSION = 1;

export const ProgressFilter = {
  ALL: "all",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INVALID: "invalid"
};

export const ProgressStatus = {
  NOT_STARTED: "notStarted",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  INVALID: "invalid"
};

function readStore() {
  if (typeof window === "undefined") {
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  }
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { schemaVersion: SCHEMA_VERSION, records: {} };
    const parsed = JSON.parse(raw);
    if (parsed?.records && typeof parsed.records === "object") {
      return parsed;
    }
    if (parsed && typeof parsed === "object" && !parsed.records) {
      return { schemaVersion: SCHEMA_VERSION, records: parsed };
    }
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, records: {} };
  }
}

function writeStore(records) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({ schemaVersion: SCHEMA_VERSION, records })
  );
  notifyStorageChanged(StorageChangeKind.practiceProgress);
}

function questionFingerprint(question) {
  if (!question || typeof question !== "object") return "";
  if (Array.isArray(question.texts)) return question.texts.join("");
  if (typeof question.stem === "string") return question.stem;
  return JSON.stringify(question);
}

export function buildSessionBankId(meta, questions) {
  const payload = JSON.stringify({
    name: meta?.name ?? "",
    type: meta?.type ?? "",
    author: meta?.author ?? "",
    version: meta?.version ?? "",
    count: Array.isArray(questions) ? questions.length : 0,
    fingerprint: (questions ?? []).slice(0, 3).map(questionFingerprint)
  });
  return `session-${md5(payload)}`;
}

function cloneResults(questions) {
  return (questions ?? []).map((question) =>
    Array.isArray(question?.results) ? [...question.results] : []
  );
}

function extractStats(snapshot) {
  return {
    totalQuestions: snapshot.totalQuestions,
    attemptedQuestions: snapshot.attemptedQuestions,
    fullyCorrectQuestions: snapshot.fullyCorrectQuestions,
    totalSlots: snapshot.totalSlots,
    attemptedSlots: snapshot.attemptedSlots,
    correctSlots: snapshot.correctSlots,
    wrongSlots: snapshot.wrongSlots,
    unansweredSlots: snapshot.unansweredSlots
  };
}

export function buildProgressRecord(meta, questions, options = {}) {
  const { includeQuestionsSnapshot = false } = options;
  const snapshot = createProgressSnapshot(questions ?? []);
  const record = {
    bankId: meta.bankId,
    bankSource: meta.bankSource ?? "session",
    name: meta.name ?? "未命名题集",
    type: meta.type ?? "",
    author: meta.author ?? "",
    version: meta.version ?? "0.0.2",
    questionCount: (questions ?? []).length,
    updatedAt: new Date().toISOString(),
    results: cloneResults(questions),
    stats: extractStats(snapshot)
  };

  if (includeQuestionsSnapshot) {
    record.questions = JSON.parse(JSON.stringify(questions ?? []));
  }

  return record;
}

export function getProgressRecord(bankId) {
  if (!bankId) return null;
  return readStore().records[bankId] ?? null;
}

export function saveProgressRecord(record) {
  if (!record?.bankId) return;
  const store = readStore();
  store.records[record.bankId] = {
    ...record,
    updatedAt: new Date().toISOString()
  };
  writeStore(store.records);
}

export function removeProgressRecord(bankId) {
  if (!bankId) return;
  const store = readStore();
  delete store.records[bankId];
  writeStore(store.records);
}

export function applyProgressToQuestions(questions, record) {
  if (!record || !Array.isArray(questions)) return false;
  if (record.questionCount !== questions.length) return false;
  if (!Array.isArray(record.results)) return false;

  record.results.forEach((row, index) => {
    if (!questions[index] || !Array.isArray(row)) return;
    questions[index].results = [...row];
  });
  return true;
}

export function deriveStatus(record) {
  if (record?.invalidReason) return ProgressStatus.INVALID;

  const { attemptedSlots = 0, unansweredSlots = 0, totalSlots = 0 } = record?.stats ?? {};
  if (attemptedSlots === 0) return ProgressStatus.NOT_STARTED;
  if (totalSlots > 0 && unansweredSlots === 0) return ProgressStatus.COMPLETED;
  if (attemptedSlots > 0 && unansweredSlots > 0) return ProgressStatus.IN_PROGRESS;
  return ProgressStatus.NOT_STARTED;
}

export function enrichWithValidity(record, banks = []) {
  if (!record) return record;
  if (record.bankSource === "session") {
    if (!Array.isArray(record.questions) || record.questions.length !== record.questionCount) {
      return { ...record, invalidReason: "sessionQuestionsMissing" };
    }
    return { ...record, invalidReason: undefined };
  }

  const bank = banks.find((item) => item.id === record.bankId);
  if (!bank) {
    return { ...record, invalidReason: "bankMissing" };
  }

  const questionCount = Array.isArray(bank.questions) ? bank.questions.length : 0;
  if (questionCount !== record.questionCount) {
    return { ...record, invalidReason: "questionCountMismatch" };
  }

  return { ...record, invalidReason: undefined };
}

function mapRecord(record, banks) {
  const enriched = enrichWithValidity(record, banks);
  return {
    ...enriched,
    status: deriveStatus(enriched)
  };
}

export function listProgressRecords(options = {}, banks = []) {
  const { filter = ProgressFilter.ALL, sort = "updatedAtDesc" } = options;
  let records = Object.values(readStore().records).map((record) => mapRecord(record, banks));

  if (filter !== ProgressFilter.ALL) {
    records = records.filter((record) => record.status === filter);
  }

  if (sort === "updatedAtDesc") {
    records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  return records;
}

export function countByStatus(records) {
  const counts = {
    all: 0,
    inProgress: 0,
    completed: 0,
    invalid: 0,
    notStarted: 0
  };

  records.forEach((record) => {
    counts.all += 1;
    if (counts[record.status] !== undefined) {
      counts[record.status] += 1;
    }
  });

  return counts;
}

export function listIncompleteRecords(banks = []) {
  return listProgressRecords({ filter: ProgressFilter.IN_PROGRESS }, banks);
}

export function getInvalidReasonLabel(reason) {
  switch (reason) {
    case "bankMissing":
      return "原题库已不存在";
    case "questionCountMismatch":
      return "题库题目数量已变更";
    case "sessionQuestionsMissing":
      return "会话题目快照缺失";
    default:
      return "记录已失效";
  }
}

export function getBankSourceLabel(source) {
  switch (source) {
    case "local":
      return "本地题库";
    case "remote":
      return "远程题库";
    case "session":
      return "首页会话";
    default:
      return "未知来源";
  }
}

/** 供测试重置 storage */
export function __clearAllProgressForTests() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROGRESS_KEY);
}
