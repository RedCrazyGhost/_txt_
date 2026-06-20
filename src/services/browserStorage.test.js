import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_STORAGE_KEYS,
  formatStorageBytes,
  getAppStorageBreakdown,
  getBrowserStorageStats,
  getKeyByteSize,
  getStorageUsageTone
} from "./browserStorage.js";

const storage = {};

function createLocalStorageMock() {
  return {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => {
      storage[key] = String(value);
    },
    removeItem: (key) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }
  };
}

describe("browserStorage", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
    vi.stubGlobal("navigator", {});
  });

  it("formats bytes", () => {
    expect(formatStorageBytes(512)).toBe("512 B");
    expect(formatStorageBytes(2048)).toBe("2.0 KB");
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe("2.00 MB");
  });

  it("returns storage usage tone by percent", () => {
    expect(getStorageUsageTone(50)).toBe("success");
    expect(getStorageUsageTone(75)).toBe("warning");
    expect(getStorageUsageTone(95)).toBe("danger");
  });

  it("sums app storage breakdown", () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.localBanks, "abc");
    window.localStorage.setItem(APP_STORAGE_KEYS.remoteBanks, "de");
    window.localStorage.setItem(APP_STORAGE_KEYS.practiceProgress, "fghij");

    const breakdown = getAppStorageBreakdown();
    expect(breakdown.localBanks).toBe(getKeyByteSize(APP_STORAGE_KEYS.localBanks));
    expect(breakdown.remoteBanks).toBe(getKeyByteSize(APP_STORAGE_KEYS.remoteBanks));
    expect(breakdown.practiceProgress).toBe(getKeyByteSize(APP_STORAGE_KEYS.practiceProgress));
    expect(breakdown.appTotal).toBe(
      breakdown.localBanks + breakdown.remoteBanks + breakdown.practiceProgress
    );
  });

  it("uses fallback quota when estimate is unavailable", async () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.localBanks, "x".repeat(1024));
    const stats = await getBrowserStorageStats();
    expect(stats.estimateAvailable).toBe(false);
    expect(stats.quota).toBe(5 * 1024 * 1024);
    expect(stats.usage).toBe(stats.appTotal);
  });

  it("uses navigator.storage.estimate when available", async () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.localBanks, "hello");
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn(async () => ({ usage: 4096, quota: 8192 }))
      }
    });

    const stats = await getBrowserStorageStats();
    expect(stats.estimateAvailable).toBe(true);
    expect(stats.quota).toBe(8192);
    expect(stats.usage).toBe(4096);
    expect(stats.percent).toBe(50);
  });
});
