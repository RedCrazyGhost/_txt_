import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_STORAGE_CHANGED_EVENT,
  StorageChangeKind,
  __resetAppStorageSyncForTests,
  initAppStorageSync,
  mapStorageKeyToKind,
  notifyStorageChanged,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "./appStorageSync.js";
import { APP_STORAGE_KEYS } from "./browserStorage.js";

describe("appStorageSync", () => {
  let customEventListeners;
  let storageListeners;
  const storage = {};

  beforeEach(() => {
    __resetAppStorageSyncForTests();
    Object.keys(storage).forEach((key) => delete storage[key]);
    customEventListeners = [];
    storageListeners = [];

    vi.stubGlobal("CustomEvent", class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    });

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key) => (key in storage ? storage[key] : null),
        setItem: (key, value) => {
          storage[key] = String(value);
        },
        removeItem: (key) => {
          delete storage[key];
        }
      },
      addEventListener(type, handler) {
        if (type === APP_STORAGE_CHANGED_EVENT) {
          customEventListeners.push(handler);
          return;
        }
        if (type === "storage") {
          storageListeners.push(handler);
        }
      },
      removeEventListener(type, handler) {
        if (type === APP_STORAGE_CHANGED_EVENT) {
          customEventListeners = customEventListeners.filter((item) => item !== handler);
          return;
        }
        if (type === "storage") {
          storageListeners = storageListeners.filter((item) => item !== handler);
        }
      },
      dispatchEvent(event) {
        customEventListeners.forEach((handler) => handler(event));
        return true;
      }
    });
  });

  afterEach(() => {
    __resetAppStorageSyncForTests();
    vi.unstubAllGlobals();
  });

  it("maps storage keys to change kinds", () => {
    expect(mapStorageKeyToKind(APP_STORAGE_KEYS.practiceProgress)).toBe(
      StorageChangeKind.practiceProgress
    );
    expect(mapStorageKeyToKind(APP_STORAGE_KEYS.localBanks)).toBe(StorageChangeKind.localBanks);
    expect(mapStorageKeyToKind(APP_STORAGE_KEYS.remoteBanks)).toBe(StorageChangeKind.remoteBanks);
    expect(mapStorageKeyToKind("unknown")).toBeNull();
  });

  it("notifies subscribed handlers", () => {
    const handler = vi.fn();
    subscribeStorageChanged(handler);
    notifyStorageChanged(StorageChangeKind.practiceProgress);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.kind).toBe(StorageChangeKind.practiceProgress);
  });

  it("unsubscribes handlers", () => {
    const handler = vi.fn();
    subscribeStorageChanged(handler);
    unsubscribeStorageChanged(handler);
    notifyStorageChanged(StorageChangeKind.localBanks);

    expect(handler).not.toHaveBeenCalled();
  });

  it("handles external storage events", () => {
    const handler = vi.fn();
    subscribeStorageChanged(handler);
    initAppStorageSync();

    storageListeners[0]({
      key: APP_STORAGE_KEYS.localBanks,
      oldValue: "[]",
      newValue: "[{}]"
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.kind).toBe(StorageChangeKind.localBanks);
  });

  it("ignores storage events with unchanged values", () => {
    const handler = vi.fn();
    subscribeStorageChanged(handler);
    initAppStorageSync();

    storageListeners[0]({
      key: APP_STORAGE_KEYS.practiceProgress,
      oldValue: "same",
      newValue: "same"
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
