import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_STORAGE_KEYS,
  countLocalStoredQuestions,
  formatStorageBytes,
  getAppStorageBreakdown,
  getBrowserStorageStats,
  getKeyByteSize,
  getStorageUsageTone,
  LOCAL_QUESTION_CAPACITY
} from "./browserStorage";

const storage: Record<string, string> = {};

function createLocalStorageMock() {
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: unknown) => {
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
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

  it("measures key size as UTF-16 code units including key name", () => {
    const key = APP_STORAGE_KEYS.localBanks;
    window.localStorage.setItem(key, "abc");
    expect(getKeyByteSize(key)).toBe(key.length + 3);
    expect(getKeyByteSize("missing_key")).toBe(0);
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

  it("uses localStorage quota and app total for stats", async () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.localBanks, "x".repeat(1024));
    const stats = await getBrowserStorageStats();
    expect(stats.quota).toBe(5 * 1024 * 1024);
    expect(stats.usage).toBe(stats.appTotal);
    expect(stats.usage).toBe(getKeyByteSize(APP_STORAGE_KEYS.localBanks));
  });

  it("ignores navigator.storage.estimate for localStorage stats", async () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.localBanks, "hello");
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn(async () => ({
          usage: 4096,
          quota: 2 * 1024 * 1024 * 1024
        }))
      }
    });

    const stats = await getBrowserStorageStats();
    expect(stats.quota).toBe(5 * 1024 * 1024);
    expect(stats.usage).toBe(stats.appTotal);
    expect(stats.usage).toBe(getKeyByteSize(APP_STORAGE_KEYS.localBanks));
  });

  it("counts local stored questions against fixed capacity", async () => {
    window.localStorage.setItem(
      APP_STORAGE_KEYS.localBanks,
      JSON.stringify([
        { questions: [{ stem: "a" }, { stem: "b" }, { stem: "c" }] },
        { questions: [{ stem: "d" }] }
      ])
    );

    expect(countLocalStoredQuestions()).toBe(4);

    const stats = await getBrowserStorageStats();
    expect(stats.localQuestionCount).toBe(4);
    expect(stats.localQuestionCapacity).toBe(LOCAL_QUESTION_CAPACITY);
    expect(stats.questionPercent).toBe((4 / LOCAL_QUESTION_CAPACITY) * 100);
  });
});
