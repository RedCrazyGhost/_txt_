export const APP_STORAGE_KEYS = {
  localBanks: "_txt_local_banks",
  remoteBanks: "_txt_remote_cache",
  practiceProgress: "_txt_practice_progress"
} as const;

const FALLBACK_QUOTA_BYTES = 5 * 1024 * 1024;

/** 本地题库题目数量上限（用于进度展示） */
export const LOCAL_QUESTION_CAPACITY = 12000;

export type StorageUsageTone = "danger" | "warning" | "success";

export interface AppStorageBreakdown {
  localBanks: number;
  remoteBanks: number;
  practiceProgress: number;
  appTotal: number;
}

export interface BrowserStorageStats {
  quota: number;
  usage: number;
  appTotal: number;
  breakdown: AppStorageBreakdown;
  percent: number;
  localQuestionCount: number;
  localQuestionCapacity: number;
  questionPercent: number;
}

interface StoredBankLike {
  questions?: unknown[];
}

export function formatStorageBytes(bytes: number | string | null | undefined): string {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function getStorageUsageTone(percent: number): StorageUsageTone {
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "success";
}

export function formatStoredQuestionCount(count: number | string | null | undefined): string {
  return (Number(count) || 0).toLocaleString("zh-CN");
}

function loadLocalBanksFromStorage(): StoredBankLike[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(APP_STORAGE_KEYS.localBanks);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredBankLike[]) : [];
  } catch {
    return [];
  }
}

export function countLocalStoredQuestions(): number {
  return loadLocalBanksFromStorage().reduce(
    (sum, bank) => sum + (bank.questions?.length ?? 0),
    0
  );
}

export function getKeyByteSize(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return 0;
  // Browsers meter localStorage quota in UTF-16 code units (key + value length), not bytes.
  return key.length + raw.length;
}

export function getAppStorageBreakdown(): AppStorageBreakdown {
  const localBanks = getKeyByteSize(APP_STORAGE_KEYS.localBanks);
  const remoteBanks = getKeyByteSize(APP_STORAGE_KEYS.remoteBanks);
  const practiceProgress = getKeyByteSize(APP_STORAGE_KEYS.practiceProgress);
  return {
    localBanks,
    remoteBanks,
    practiceProgress,
    appTotal: localBanks + remoteBanks + practiceProgress
  };
}

export async function getBrowserStorageStats(): Promise<BrowserStorageStats> {
  const breakdown = getAppStorageBreakdown();
  const quota = FALLBACK_QUOTA_BYTES;
  const usage = breakdown.appTotal;
  const percent = quota > 0 ? (usage / quota) * 100 : 0;
  const localQuestionCount = countLocalStoredQuestions();
  const localQuestionCapacity = LOCAL_QUESTION_CAPACITY;
  const questionPercent =
    localQuestionCapacity > 0 ? (localQuestionCount / localQuestionCapacity) * 100 : 0;

  return {
    quota,
    usage,
    appTotal: breakdown.appTotal,
    breakdown,
    percent,
    localQuestionCount,
    localQuestionCapacity,
    questionPercent
  };
}
