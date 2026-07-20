import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PRACTICE_TIMER_DURATION_SEC,
  formatTimerSeconds,
  normalizePracticeTimerDurationSec,
  normalizePracticeTimerMode,
  normalizePracticeTimerOnEnd,
  resolveCountdownEnd
} from "./practiceTimer";

describe("practiceTimer", () => {
  it("normalizes mode and onEnd enums", () => {
    expect(normalizePracticeTimerMode("countup")).toBe("countup");
    expect(normalizePracticeTimerMode("COUNTDOWN")).toBe("countdown");
    expect(normalizePracticeTimerMode("nope")).toBe("off");
    expect(normalizePracticeTimerOnEnd("lock")).toBe("lock");
    expect(normalizePracticeTimerOnEnd("x")).toBe("remind");
    expect(resolveCountdownEnd("lock")).toBe("lock");
  });

  it("clamps duration seconds", () => {
    expect(normalizePracticeTimerDurationSec(10)).toBe(30);
    expect(normalizePracticeTimerDurationSec(1500)).toBe(1500);
    expect(normalizePracticeTimerDurationSec("900")).toBe(900);
    expect(normalizePracticeTimerDurationSec(NaN)).toBe(DEFAULT_PRACTICE_TIMER_DURATION_SEC);
  });

  it("formats timer display", () => {
    expect(formatTimerSeconds(0)).toBe("00:00:00");
    expect(formatTimerSeconds(65)).toBe("00:01:05");
    expect(formatTimerSeconds(3661)).toBe("01:01:01");
  });
});
