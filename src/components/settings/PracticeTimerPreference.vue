<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { loadAppPrefs, setPracticeTimerPrefs, type AppPrefs } from "../../services/appPrefsStorage";
import {
  DEFAULT_PRACTICE_TIMER_DURATION_SEC,
  normalizePracticeTimerDurationSec,
  type PracticeTimerMode,
  type PracticeTimerOnEnd
} from "../../services/practiceTimer";

const prefs = ref<AppPrefs>(loadAppPrefs());

const mode = computed({
  get: (): PracticeTimerMode => prefs.value.practiceTimerMode,
  set: (value: PracticeTimerMode) => {
    prefs.value = setPracticeTimerPrefs({ practiceTimerMode: value });
  }
});

const onEnd = computed({
  get: (): PracticeTimerOnEnd => prefs.value.practiceTimerOnEnd,
  set: (value: PracticeTimerOnEnd) => {
    prefs.value = setPracticeTimerPrefs({ practiceTimerOnEnd: value });
  }
});

const durationMinutes = ref(
  Math.round((prefs.value.practiceTimerDurationSec || DEFAULT_PRACTICE_TIMER_DURATION_SEC) / 60)
);

watch(durationMinutes, (minutes) => {
  const sec = normalizePracticeTimerDurationSec(Number(minutes) * 60);
  prefs.value = setPracticeTimerPrefs({ practiceTimerDurationSec: sec });
  durationMinutes.value = Math.round(sec / 60);
});

const showCountdownOptions = computed(() => mode.value === "countdown");
</script>

<template>
  <div class="practice-timer-preference">
    <div class="mb-3">
      <label class="form-label" for="practice-timer-mode">计时模式</label>
      <select id="practice-timer-mode" v-model="mode" class="form-select form-select-sm">
        <option value="off">关闭</option>
        <option value="countup">正计时（累计用时）</option>
        <option value="countdown">倒计时</option>
      </select>
    </div>

    <div v-if="showCountdownOptions" class="mb-3">
      <label class="form-label" for="practice-timer-minutes">倒计时时长（分钟）</label>
      <input
        id="practice-timer-minutes"
        v-model.number="durationMinutes"
        class="form-control form-control-sm"
        type="number"
        min="1"
        max="1440"
        step="1"
      />
      <p class="small text-muted mb-0 mt-1">最短约 1 分钟，最长 24 小时。</p>
    </div>

    <div v-if="showCountdownOptions">
      <p class="form-label mb-2">倒计时结束时</p>
      <div class="form-check">
        <input
          id="practice-timer-on-end-remind"
          v-model="onEnd"
          class="form-check-input"
          type="radio"
          value="remind"
        />
        <label class="form-check-label" for="practice-timer-on-end-remind">
          仅提醒：提示后仍可继续答题
        </label>
      </div>
      <div class="form-check">
        <input
          id="practice-timer-on-end-lock"
          v-model="onEnd"
          class="form-check-input"
          type="radio"
          value="lock"
        />
        <label class="form-check-label" for="practice-timer-on-end-lock">
          停止：锁定答题（仍可查看与导出）
        </label>
      </div>
    </div>
  </div>
</template>
