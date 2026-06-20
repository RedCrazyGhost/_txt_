import { APP_STORAGE_KEYS } from "./browserStorage.js";
import {
  reloadLocalBanks,
  reloadRemoteBanksFromCache
} from "../state/questionBankState.js";

export const APP_STORAGE_CHANGED_EVENT = "txt-storage-changed";

export const StorageChangeKind = {
  practiceProgress: "practiceProgress",
  localBanks: "localBanks",
  remoteBanks: "remoteBanks"
};

const KEY_TO_KIND = {
  [APP_STORAGE_KEYS.practiceProgress]: StorageChangeKind.practiceProgress,
  [APP_STORAGE_KEYS.localBanks]: StorageChangeKind.localBanks,
  [APP_STORAGE_KEYS.remoteBanks]: StorageChangeKind.remoteBanks
};

let initialized = false;
let storageHandler = null;

export function mapStorageKeyToKind(key) {
  return KEY_TO_KIND[key] ?? null;
}

export function notifyStorageChanged(kind) {
  if (typeof window === "undefined" || !kind) return;
  window.dispatchEvent(new CustomEvent(APP_STORAGE_CHANGED_EVENT, { detail: { kind } }));
}

export function subscribeStorageChanged(handler) {
  if (typeof window === "undefined") return;
  window.addEventListener(APP_STORAGE_CHANGED_EVENT, handler);
}

export function unsubscribeStorageChanged(handler) {
  if (typeof window === "undefined") return;
  window.removeEventListener(APP_STORAGE_CHANGED_EVENT, handler);
}

function handleExternalStorageChange(kind) {
  if (kind === StorageChangeKind.localBanks) {
    reloadLocalBanks();
  } else if (kind === StorageChangeKind.remoteBanks) {
    reloadRemoteBanksFromCache();
  }
  notifyStorageChanged(kind);
}

function onStorageEvent(event) {
  if (!event?.key) return;
  const kind = mapStorageKeyToKind(event.key);
  if (!kind) return;
  if (event.newValue === event.oldValue) return;
  handleExternalStorageChange(kind);
}

export function initAppStorageSync() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  storageHandler = onStorageEvent;
  window.addEventListener("storage", storageHandler);
}

export function __resetAppStorageSyncForTests() {
  if (typeof window !== "undefined" && storageHandler) {
    window.removeEventListener("storage", storageHandler);
  }
  initialized = false;
  storageHandler = null;
}
