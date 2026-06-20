export const APP_STORAGE_KEYS = {
  localBanks: "_txt_local_banks",
  remoteBanks: "_txt_remote_cache",
  practiceProgress: "_txt_practice_progress"
};

const FALLBACK_QUOTA_BYTES = 5 * 1024 * 1024;

export function formatStorageBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function getStorageUsageTone(percent) {
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "success";
}

export function getKeyByteSize(key) {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  if (!raw) return 0;
  return new Blob([raw]).size;
}

export function getAppStorageBreakdown() {
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

export async function getBrowserStorageStats() {
  const breakdown = getAppStorageBreakdown();
  let quota = FALLBACK_QUOTA_BYTES;
  let usage = breakdown.appTotal;
  let estimateAvailable = false;

  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.quota === "number" && estimate.quota > 0) {
        quota = estimate.quota;
        estimateAvailable = true;
      }
      if (typeof estimate.usage === "number") {
        usage = estimate.usage;
      }
    } catch {
      estimateAvailable = false;
    }
  }

  const percent = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;

  return {
    quota,
    usage,
    appTotal: breakdown.appTotal,
    breakdown,
    percent,
    estimateAvailable
  };
}
