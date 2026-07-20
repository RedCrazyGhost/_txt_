import {
  getPendingSetupSteps,
  hasPendingSetupSteps,
  normalizeSeenSetupSteps,
  SETUP_GUIDE_STEP_IDS,
  type SetupGuideStep
} from "./setupGuide";
import {
  DEFAULT_PRACTICE_TIMER_DURATION_SEC,
  normalizePracticeTimerDurationSec,
  normalizePracticeTimerMode,
  normalizePracticeTimerOnEnd,
  type PracticeTimerMode,
  type PracticeTimerOnEnd
} from "./practiceTimer";

export const APP_PREFS_STORAGE_KEY = "_txt_app_prefs";

export type AppTheme = "light" | "dark";

export interface AppPrefs {
  theme: AppTheme;
  onboardingDone: boolean;
  seenSetupSteps: string[];
  /** Kept for PracticeTimerPreference / legacy; practice page uses session timer. */
  practiceTimerMode: PracticeTimerMode;
  practiceTimerDurationSec: number;
  practiceTimerOnEnd: PracticeTimerOnEnd;
}

export const DEFAULT_APP_PREFS: AppPrefs = {
  theme: "light",
  onboardingDone: false,
  seenSetupSteps: [],
  practiceTimerMode: "off",
  practiceTimerDurationSec: DEFAULT_PRACTICE_TIMER_DURATION_SEC,
  practiceTimerOnEnd: "remind"
};

function normalizeTheme(value: unknown): AppTheme {
  return value === "dark" ? "dark" : "light";
}

export function normalizeAppPrefs(raw: unknown): AppPrefs {
  const merged = {
    ...DEFAULT_APP_PREFS,
    ...(raw && typeof raw === "object" ? (raw as Partial<AppPrefs>) : {})
  };
  let seenSetupSteps = normalizeSeenSetupSteps(merged.seenSetupSteps);
  const onboardingDone = Boolean(merged.onboardingDone);

  // onboardingDone 表示引导完成：补齐全部已知配置步骤（含旧版仅写 onboardingDone、或只记了部分步骤）
  if (onboardingDone) {
    seenSetupSteps = [...SETUP_GUIDE_STEP_IDS];
  }

  return {
    theme: normalizeTheme(merged.theme),
    onboardingDone,
    seenSetupSteps,
    practiceTimerMode: normalizePracticeTimerMode(merged.practiceTimerMode),
    practiceTimerDurationSec: normalizePracticeTimerDurationSec(merged.practiceTimerDurationSec),
    practiceTimerOnEnd: normalizePracticeTimerOnEnd(merged.practiceTimerOnEnd)
  };
}

export function loadAppPrefs(): AppPrefs {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_APP_PREFS,
      seenSetupSteps: []
    };
  }
  const raw = window.localStorage.getItem(APP_PREFS_STORAGE_KEY);
  if (!raw) {
    return {
      ...DEFAULT_APP_PREFS,
      seenSetupSteps: []
    };
  }
  try {
    return normalizeAppPrefs(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_APP_PREFS,
      seenSetupSteps: []
    };
  }
}

export function saveAppPrefs(prefs: unknown): AppPrefs {
  const normalized = normalizeAppPrefs(prefs);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_PREFS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function setTheme(theme: unknown): AppPrefs {
  const prefs = loadAppPrefs();
  return saveAppPrefs({ ...prefs, theme: normalizeTheme(theme) });
}

export interface PracticeTimerPrefsPatch {
  practiceTimerMode?: unknown;
  practiceTimerDurationSec?: unknown;
  practiceTimerOnEnd?: unknown;
}

/** Persist practice-timer prefs (settings UI optional; not mounted by default). */
export function setPracticeTimerPrefs(patch: PracticeTimerPrefsPatch = {}): AppPrefs {
  const prefs = loadAppPrefs();
  return saveAppPrefs({
    ...prefs,
    practiceTimerMode:
      patch.practiceTimerMode !== undefined
        ? normalizePracticeTimerMode(patch.practiceTimerMode)
        : prefs.practiceTimerMode,
    practiceTimerDurationSec:
      patch.practiceTimerDurationSec !== undefined
        ? normalizePracticeTimerDurationSec(patch.practiceTimerDurationSec)
        : prefs.practiceTimerDurationSec,
    practiceTimerOnEnd:
      patch.practiceTimerOnEnd !== undefined
        ? normalizePracticeTimerOnEnd(patch.practiceTimerOnEnd)
        : prefs.practiceTimerOnEnd
  });
}

export function markSetupStepSeen(stepId: unknown): AppPrefs {
  const prefs = loadAppPrefs();
  const seenSetupSteps = normalizeSeenSetupSteps([...prefs.seenSetupSteps, stepId]);
  const pending = getPendingSetupSteps(seenSetupSteps);
  return saveAppPrefs({
    ...prefs,
    seenSetupSteps,
    onboardingDone: prefs.onboardingDone || pending.length === 0
  });
}

export function markSetupStepsSeen(stepIds: unknown): AppPrefs {
  const prefs = loadAppPrefs();
  const seenSetupSteps = normalizeSeenSetupSteps([
    ...prefs.seenSetupSteps,
    ...(Array.isArray(stepIds) ? stepIds : [])
  ]);
  const pending = getPendingSetupSteps(seenSetupSteps);
  return saveAppPrefs({
    ...prefs,
    seenSetupSteps,
    onboardingDone: prefs.onboardingDone || pending.length === 0
  });
}

export function resetSetupGuideProgress(): AppPrefs {
  const prefs = loadAppPrefs();
  return saveAppPrefs({
    ...prefs,
    seenSetupSteps: [],
    onboardingDone: false
  });
}

export function markOnboardingDone(): AppPrefs {
  const prefs = loadAppPrefs();
  return saveAppPrefs({
    ...prefs,
    onboardingDone: true,
    seenSetupSteps: [...SETUP_GUIDE_STEP_IDS]
  });
}

export function isOnboardingDone(): boolean {
  return !hasPendingSetupSteps(loadAppPrefs().seenSetupSteps);
}

export function listPendingSetupSteps(): SetupGuideStep[] {
  return getPendingSetupSteps(loadAppPrefs().seenSetupSteps);
}

export function listSeenSetupSteps(): string[] {
  return [...loadAppPrefs().seenSetupSteps];
}
