import { APP_STORAGE_KEYS } from "./browserStorage";
import {
  reloadLocalBanks,
  reloadRemoteBanksFromCache
} from "../state/questionBankState";

export const APP_STORAGE_CHANGED_EVENT = "txt-storage-changed";

export const StorageChangeKind = {
  practiceProgress: "practiceProgress",
  localBanks: "localBanks",
  remoteBanks: "remoteBanks"
} as const;

export type StorageChangeKind = (typeof StorageChangeKind)[keyof typeof StorageChangeKind];

const KEY_TO_KIND: Partial<Record<string, StorageChangeKind>> = {
  [APP_STORAGE_KEYS.practiceProgress]: StorageChangeKind.practiceProgress,
  [APP_STORAGE_KEYS.localBanks]: StorageChangeKind.localBanks,
  [APP_STORAGE_KEYS.remoteBanks]: StorageChangeKind.remoteBanks
};

type CacheInvalidator = () => void;
const cacheInvalidators: Partial<Record<StorageChangeKind, CacheInvalidator>> = {};

let initialized = false;
let storageHandler: ((event: StorageEvent) => void) | null = null;

/** 注册跨标签 storage 变更时的内存缓存失效逻辑（避免与业务模块循环依赖）。 */
export function registerStorageCacheInvalidator(
  kind: StorageChangeKind,
  invalidator: CacheInvalidator
): void {
  cacheInvalidators[kind] = invalidator;
}

export function mapStorageKeyToKind(key: string): StorageChangeKind | null {
  return KEY_TO_KIND[key] ?? null;
}

export function notifyStorageChanged(kind: StorageChangeKind): void {
  if (typeof window === "undefined" || !kind) return;
  window.dispatchEvent(new CustomEvent(APP_STORAGE_CHANGED_EVENT, { detail: { kind } }));
}

export function subscribeStorageChanged(handler: (event: Event) => void): void {
  if (typeof window === "undefined") return;
  window.addEventListener(APP_STORAGE_CHANGED_EVENT, handler);
}

export function unsubscribeStorageChanged(handler: (event: Event) => void): void {
  if (typeof window === "undefined") return;
  window.removeEventListener(APP_STORAGE_CHANGED_EVENT, handler);
}

function handleExternalStorageChange(kind: StorageChangeKind): void {
  cacheInvalidators[kind]?.();
  if (kind === StorageChangeKind.localBanks) {
    reloadLocalBanks();
  } else if (kind === StorageChangeKind.remoteBanks) {
    reloadRemoteBanksFromCache();
  }
  notifyStorageChanged(kind);
}

function onStorageEvent(event: StorageEvent): void {
  if (!event?.key) return;
  const kind = mapStorageKeyToKind(event.key);
  if (!kind) return;
  if (event.newValue === event.oldValue) return;
  handleExternalStorageChange(kind);
}

export function initAppStorageSync(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  storageHandler = onStorageEvent;
  window.addEventListener("storage", storageHandler);
}

export function __resetAppStorageSyncForTests(): void {
  if (typeof window !== "undefined" && storageHandler) {
    window.removeEventListener("storage", storageHandler);
  }
  initialized = false;
  storageHandler = null;
}
