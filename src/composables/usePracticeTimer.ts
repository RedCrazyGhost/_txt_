import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import {
  formatTimerSeconds,
  normalizePracticeTimerDurationSec,
  normalizePracticeTimerMode,
  normalizePracticeTimerOnEnd,
  type PracticeTimerMode,
  type PracticeTimerOnEnd
} from "../services/practiceTimer";

export interface PracticeTimerEndPayload {
  action: PracticeTimerOnEnd;
}

export interface UsePracticeTimerOptions {
  onEndReached?: (payload: PracticeTimerEndPayload) => void;
}

export interface ApplySessionConfigParams {
  nextMode?: PracticeTimerMode | string;
  nextDurationSec?: number | string;
  nextOnEnd?: PracticeTimerOnEnd | string;
}

export interface UsePracticeTimerReturn {
  mode: Ref<PracticeTimerMode>;
  durationSec: Ref<number>;
  onEnd: Ref<PracticeTimerOnEnd>;
  running: Ref<boolean>;
  locked: Ref<boolean>;
  ended: Ref<boolean>;
  displayText: Ref<string>;
  isUrgent: Ref<boolean>;
  isVisible: Ref<boolean>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  applySessionConfig: (params?: ApplySessionConfigParams) => void;
}

/**
 * Session-only practice timer. Does not auto-start; user must resume/start.
 */
export function usePracticeTimer(
  options: UsePracticeTimerOptions = {}
): UsePracticeTimerReturn {
  const mode = ref<PracticeTimerMode>("off");
  const durationSec = ref(1500);
  const onEnd = ref<PracticeTimerOnEnd>("remind");
  const running = ref(false);
  const locked = ref(false);
  const ended = ref(false);
  const elapsedMs = ref(0);

  let startedAt = 0;
  let accumulatedMs = 0;
  let rafId = 0;

  const displaySeconds = computed(() => {
    if (mode.value === "countdown") {
      return Math.max(0, Math.ceil((durationSec.value * 1000 - elapsedMs.value) / 1000));
    }
    return Math.floor(elapsedMs.value / 1000);
  });

  const displayText = computed(() => formatTimerSeconds(displaySeconds.value));

  const isUrgent = computed(
    () => mode.value === "countdown" && !ended.value && displaySeconds.value <= 60
  );

  const isVisible = computed(() => mode.value !== "off");

  function stopRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function tick() {
    if (!running.value) return;
    const now = performance.now();
    elapsedMs.value = accumulatedMs + (now - startedAt);

    if (mode.value === "countdown" && elapsedMs.value >= durationSec.value * 1000) {
      elapsedMs.value = durationSec.value * 1000;
      running.value = false;
      stopRaf();
      if (!ended.value) {
        ended.value = true;
        const action = normalizePracticeTimerOnEnd(onEnd.value);
        if (action === "lock") locked.value = true;
        options.onEndReached?.({ action });
      }
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (mode.value === "off" || ended.value) return;
    if (running.value) return;
    running.value = true;
    startedAt = performance.now();
    stopRaf();
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!running.value) return;
    accumulatedMs = elapsedMs.value;
    running.value = false;
    stopRaf();
  }

  function resume() {
    if (ended.value || mode.value === "off") return;
    start();
  }

  /** Clear elapsed time; keeps current session mode/duration/onEnd. Does not auto-start. */
  function reset() {
    stopRaf();
    running.value = false;
    locked.value = false;
    ended.value = false;
    elapsedMs.value = 0;
    accumulatedMs = 0;
    startedAt = 0;
  }

  function applySessionConfig({
    nextMode,
    nextDurationSec,
    nextOnEnd
  }: ApplySessionConfigParams = {}) {
    pause();
    if (nextMode !== undefined) mode.value = normalizePracticeTimerMode(nextMode);
    if (nextDurationSec !== undefined) {
      durationSec.value = normalizePracticeTimerDurationSec(nextDurationSec);
    }
    if (nextOnEnd !== undefined) onEnd.value = normalizePracticeTimerOnEnd(nextOnEnd);
    ended.value = false;
    locked.value = false;
    elapsedMs.value = 0;
    accumulatedMs = 0;
    startedAt = 0;
  }

  onBeforeUnmount(() => {
    stopRaf();
  });

  watch(mode, (value) => {
    if (value === "off") {
      pause();
      locked.value = false;
      ended.value = false;
    }
  });

  return {
    mode,
    durationSec,
    onEnd,
    running,
    locked,
    ended,
    displayText,
    isUrgent,
    isVisible,
    start,
    pause,
    resume,
    reset,
    applySessionConfig
  };
}
