import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_PREFS_STORAGE_KEY,
  DEFAULT_APP_PREFS,
  isOnboardingDone,
  listPendingSetupSteps,
  loadAppPrefs,
  markOnboardingDone,
  markSetupStepSeen,
  resetSetupGuideProgress,
  saveAppPrefs,
  setPracticeTimerPrefs,
  setTheme
} from "./appPrefsStorage";
import { SETUP_GUIDE_STEP_IDS } from "./setupGuide";

interface MockStorage {
  store: Record<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

describe("appPrefsStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        }
      } satisfies MockStorage
    });
    (window.localStorage as unknown as MockStorage).store = {};
  });

  it("returns defaults when storage is empty", () => {
    expect(loadAppPrefs()).toEqual({
      ...DEFAULT_APP_PREFS,
      seenSetupSteps: []
    });
  });

  it("persists theme and normalizes invalid theme to light", () => {
    expect(setTheme("dark").theme).toBe("dark");
    expect(loadAppPrefs().theme).toBe("dark");
    expect(setTheme("neon").theme).toBe("light");
  });

  it("marks individual setup steps as seen and completes when all are seen", () => {
    setTheme("dark");
    expect(listPendingSetupSteps().map((step) => step.id)).toEqual(SETUP_GUIDE_STEP_IDS);

    markSetupStepSeen("theme");
    expect(listPendingSetupSteps().map((step) => step.id)).toEqual(
      SETUP_GUIDE_STEP_IDS.filter((id) => id !== "theme")
    );
    expect(isOnboardingDone()).toBe(false);

    for (const id of SETUP_GUIDE_STEP_IDS) {
      markSetupStepSeen(id);
    }
    expect(isOnboardingDone()).toBe(true);
    expect(listPendingSetupSteps()).toEqual([]);
    expect(loadAppPrefs().theme).toBe("dark");
  });

  it("migrates legacy onboardingDone into all seen setup steps", () => {
    window.localStorage.setItem(
      APP_PREFS_STORAGE_KEY,
      JSON.stringify({ theme: "dark", onboardingDone: true })
    );
    expect(loadAppPrefs().seenSetupSteps).toEqual(SETUP_GUIDE_STEP_IDS);
    expect(isOnboardingDone()).toBe(true);
  });

  it("resetSetupGuideProgress clears seen steps for full reconfigure", () => {
    markOnboardingDone();
    expect(isOnboardingDone()).toBe(true);
    resetSetupGuideProgress();
    expect(loadAppPrefs().seenSetupSteps).toEqual([]);
    expect(isOnboardingDone()).toBe(false);
  });

  it("saveAppPrefs merges and normalizes", () => {
    const saved = saveAppPrefs({
      theme: "dark",
      onboardingDone: 1,
      seenSetupSteps: ["theme", "theme", "unknown"],
      extra: true
    });
    expect(saved).toEqual({
      theme: "dark",
      onboardingDone: true,
      seenSetupSteps: ["theme", ...SETUP_GUIDE_STEP_IDS.filter((id) => id !== "theme")],
      practiceTimerMode: "off",
      practiceTimerDurationSec: DEFAULT_APP_PREFS.practiceTimerDurationSec,
      practiceTimerOnEnd: "remind"
    });
  });

  it("setPracticeTimerPrefs updates timer fields only", () => {
    const saved = setPracticeTimerPrefs({
      practiceTimerMode: "countdown",
      practiceTimerDurationSec: 600,
      practiceTimerOnEnd: "lock"
    });
    expect(saved.practiceTimerMode).toBe("countdown");
    expect(saved.practiceTimerDurationSec).toBe(600);
    expect(saved.practiceTimerOnEnd).toBe("lock");
    expect(loadAppPrefs().practiceTimerMode).toBe("countdown");
  });
});
