export const PRACTICE_TIMER_MODES = ["off", "countup", "countdown"] as const;
export const PRACTICE_TIMER_ON_END = ["remind", "lock"] as const;
export const DEFAULT_PRACTICE_TIMER_DURATION_SEC = 1500;

export type PracticeTimerMode = (typeof PRACTICE_TIMER_MODES)[number];
export type PracticeTimerOnEnd = (typeof PRACTICE_TIMER_ON_END)[number];

export function normalizePracticeTimerMode(value: unknown): PracticeTimerMode {
  const mode = String(value ?? "").trim().toLowerCase();
  return (PRACTICE_TIMER_MODES as readonly string[]).includes(mode)
    ? (mode as PracticeTimerMode)
    : "off";
}

export function normalizePracticeTimerOnEnd(value: unknown): PracticeTimerOnEnd {
  const action = String(value ?? "").trim().toLowerCase();
  return (PRACTICE_TIMER_ON_END as readonly string[]).includes(action)
    ? (action as PracticeTimerOnEnd)
    : "remind";
}

export function normalizePracticeTimerDurationSec(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PRACTICE_TIMER_DURATION_SEC;
  return Math.min(24 * 60 * 60, Math.max(30, Math.round(n)));
}

/** 将非负秒数格式化为 HH:MM:SS（不足一小时也显示时位，便于对齐）。 */
export function formatTimerSeconds(totalSec: number | string | null | undefined): string {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

export function resolveCountdownEnd(onEnd: unknown): PracticeTimerOnEnd {
  return normalizePracticeTimerOnEnd(onEnd);
}
