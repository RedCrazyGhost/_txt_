<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { ApplySessionConfigParams } from "../../composables/usePracticeTimer";
import type { PracticeTimerMode, PracticeTimerOnEnd } from "../../services/practiceTimer";

const props = withDefaults(
  defineProps<{
    mode?: PracticeTimerMode;
    displayText?: string;
    running?: boolean;
    ended?: boolean;
    locked?: boolean;
    isUrgent?: boolean;
    durationSec?: number;
    onEnd?: PracticeTimerOnEnd;
  }>(),
  {
    mode: "off",
    displayText: "00:00:00",
    running: false,
    ended: false,
    locked: false,
    isUrgent: false,
    durationSec: 1500,
    onEnd: "remind"
  }
);

const emit = defineEmits<{
  pause: [];
  resume: [];
  reset: [];
  "apply-session": [payload: ApplySessionConfigParams];
  "dismiss-lock": [];
}>();

const editing = ref(false);
const reminding = ref(false);
const showLockOverlay = ref(false);
const lockOverlayVisible = ref(false);
const draftMode = ref<PracticeTimerMode>(props.mode);
const draftMinutes = ref(Math.round(props.durationSec / 60));
const draftOnEnd = ref<PracticeTimerOnEnd>(props.onEnd);

let revealRaf = 0;

const prefersReducedMotion = computed(() => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});

const isRemindEnded = computed(
  () => props.ended && !props.locked && props.onEnd === "remind"
);

const iconClass = computed(() => {
  if (reminding.value) return "fas fa-bell";
  if (props.locked) return "fas fa-ban";
  return "fas fa-stopwatch";
});

const titleHint = computed(() => {
  if (editing.value) return "本场调整";
  if (reminding.value) return "时间到，点击停止提醒";
  if (props.mode === "off") return "计时关闭，展开可本场调整";
  if (props.locked) return "已锁定";
  if (props.ended) return "时间到";
  if (!props.running) return `${props.displayText}（已暂停）`;
  return props.displayText;
});

watch(
  isRemindEnded,
  (active) => {
    if (active) reminding.value = true;
    else reminding.value = false;
  },
  { immediate: true }
);

watch(
  () => props.locked,
  (locked) => {
    if (locked) openLockOverlay();
    else closeLockOverlay();
  }
);

onBeforeUnmount(() => {
  if (revealRaf) cancelAnimationFrame(revealRaf);
});

function dismissRemind() {
  reminding.value = false;
}

function openLockOverlay() {
  showLockOverlay.value = true;
  lockOverlayVisible.value = prefersReducedMotion.value;
  if (prefersReducedMotion.value) return;
  if (revealRaf) cancelAnimationFrame(revealRaf);
  nextTick(() => {
    revealRaf = requestAnimationFrame(() => {
      revealRaf = requestAnimationFrame(() => {
        lockOverlayVisible.value = true;
        revealRaf = 0;
      });
    });
  });
}

function closeLockOverlay() {
  if (revealRaf) {
    cancelAnimationFrame(revealRaf);
    revealRaf = 0;
  }
  showLockOverlay.value = false;
  lockOverlayVisible.value = false;
}

function dismissLockOverlay() {
  closeLockOverlay();
  emit("dismiss-lock");
}

function openEdit() {
  draftMode.value = props.mode;
  draftMinutes.value = Math.max(1, Math.round(props.durationSec / 60));
  draftOnEnd.value = props.onEnd;
  editing.value = true;
}

function applyEdit() {
  emit("apply-session", {
    nextMode: draftMode.value,
    nextDurationSec: Number(draftMinutes.value) * 60,
    nextOnEnd: draftOnEnd.value
  });
  editing.value = false;
  if (draftMode.value !== "off") {
    emit("resume");
  }
}

function cancelEdit() {
  editing.value = false;
}
</script>

<template>
  <div
    class="practice-timer-fab"
    :class="{
      'is-urgent': isUrgent,
      'is-ended': locked || reminding,
      'is-locked': locked,
      'is-editing': editing,
      'is-reminding': reminding
    }"
    :title="titleHint"
  >
    <div class="practice-timer-fab-inner">
      <template v-if="editing">
        <div class="practice-timer-fab-edit" @mousedown.stop>
          <div class="practice-timer-fab-panel-row">
            <label class="practice-timer-fab-field-label" for="session-timer-mode">模式</label>
            <select id="session-timer-mode" v-model="draftMode" class="form-select form-select-sm">
              <option value="off">关闭</option>
              <option value="countup">正计时</option>
              <option value="countdown">倒计时</option>
            </select>
          </div>
          <div v-if="draftMode === 'countdown'" class="practice-timer-fab-panel-row">
            <label class="practice-timer-fab-field-label" for="session-timer-min">分钟</label>
            <input
              id="session-timer-min"
              v-model.number="draftMinutes"
              class="form-control form-control-sm"
              type="number"
              min="1"
              max="1440"
            />
          </div>
          <div v-if="draftMode === 'countdown'" class="practice-timer-fab-panel-row">
            <label class="practice-timer-fab-field-label" for="session-timer-on-end">到点</label>
            <select id="session-timer-on-end" v-model="draftOnEnd" class="form-select form-select-sm">
              <option value="remind">提醒</option>
              <option value="lock">停止</option>
            </select>
          </div>
        </div>
        <div class="practice-timer-fab-edit-footer">
          <span class="practice-timer-fab-icon" aria-hidden="true">
            <i :class="iconClass"></i>
          </span>
          <div class="practice-timer-fab-panel-actions">
            <button
              type="button"
              class="practice-timer-fab-action practice-timer-fab-action--primary"
              title="开始"
              aria-label="开始"
              @click="applyEdit"
            >
              <i class="fas fa-play" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="practice-timer-fab-action"
              title="取消"
              aria-label="取消"
              @click="cancelEdit"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <button
          v-if="reminding"
          type="button"
          class="practice-timer-fab-icon practice-timer-fab-icon--btn is-swaying"
          title="时间到，点击停止提醒"
          aria-label="时间到，点击停止提醒"
          @click.stop="dismissRemind"
        >
          <i :class="iconClass" aria-hidden="true"></i>
        </button>
        <span v-else class="practice-timer-fab-icon" aria-hidden="true">
          <i :class="iconClass"></i>
        </span>

        <div class="practice-timer-fab-body">
          <template v-if="mode !== 'off'">
            <strong class="practice-timer-fab-time font-monospace">{{ displayText }}</strong>
            <button
              v-if="running"
              type="button"
              class="practice-timer-fab-action"
              :disabled="ended && mode === 'countdown'"
              title="暂停"
              aria-label="暂停"
              @click="emit('pause')"
            >
              <i class="fas fa-pause" aria-hidden="true"></i>
            </button>
            <button
              v-else
              type="button"
              class="practice-timer-fab-action"
              :disabled="ended"
              title="继续"
              aria-label="继续"
              @click="emit('resume')"
            >
              <i class="fas fa-play" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="practice-timer-fab-action"
              title="重置"
              aria-label="重置"
              @click="emit('reset')"
            >
              <i class="fas fa-undo" aria-hidden="true"></i>
            </button>
          </template>
          <span v-else class="practice-timer-fab-off-hint">未开启</span>
          <button
            type="button"
            class="practice-timer-fab-action practice-timer-fab-action--primary"
            title="本场调整"
            aria-label="本场调整"
            @click="openEdit"
          >
            <i class="fas fa-sliders-h" aria-hidden="true"></i>
          </button>
        </div>
      </template>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showLockOverlay"
      class="practice-timer-lock-overlay"
      :class="{
        'is-visible': lockOverlayVisible,
        'is-reduced-motion': prefersReducedMotion
      }"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="practice-timer-lock-title"
      @click.self="dismissLockOverlay"
    >
      <div class="practice-timer-lock-content">
        <div class="practice-timer-lock-icon" aria-hidden="true">
          <i class="fas fa-ban"></i>
        </div>
        <div class="practice-timer-lock-message">
          <p id="practice-timer-lock-title" class="practice-timer-lock-title">时间到，练习已锁定</p>
          <button type="button" class="btn btn-light btn-sm" @click="dismissLockOverlay">
            知道了
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.practice-timer-fab {
  --fab-edge: var(--app-fab-edge, 12px);
  --fab-bottom: var(--app-fab-bottom, 12px);
  --fab-expanded-width: min(248px, calc(100vw - 24px));
  position: fixed;
  bottom: calc(var(--fab-bottom) + 42px + 0.45rem);
  left: calc(var(--fab-edge) + env(safe-area-inset-left, 0px));
  z-index: 1040;
}

.practice-timer-fab-inner {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 42px;
  width: 42px;
  border-radius: 21px;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition:
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.3s ease,
    box-shadow 0.25s ease,
    border-color 0.2s ease;
}

.practice-timer-fab:hover .practice-timer-fab-inner,
.practice-timer-fab:focus-within .practice-timer-fab-inner,
.practice-timer-fab.is-editing .practice-timer-fab-inner {
  width: var(--fab-expanded-width);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}

.practice-timer-fab.is-editing .practice-timer-fab-inner {
  flex-direction: column;
  align-items: stretch;
  height: auto;
  min-height: 42px;
  border-radius: 0.75rem;
  padding: 0.55rem 0.65rem 0;
}

.practice-timer-fab.is-urgent .practice-timer-fab-inner {
  border-color: var(--bs-warning);
}

.practice-timer-fab.is-ended .practice-timer-fab-inner,
.practice-timer-fab.is-locked .practice-timer-fab-inner,
.practice-timer-fab.is-reminding .practice-timer-fab-inner {
  border-color: var(--bs-danger);
}

.practice-timer-fab-icon {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-secondary);
}

.practice-timer-fab-icon--btn {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
}

.practice-timer-fab.is-urgent .practice-timer-fab-icon {
  color: var(--bs-warning-text-emphasis, #664d03);
}

.practice-timer-fab.is-ended .practice-timer-fab-icon,
.practice-timer-fab.is-locked .practice-timer-fab-icon,
.practice-timer-fab.is-reminding .practice-timer-fab-icon {
  color: var(--bs-danger);
}

.practice-timer-fab-icon.is-swaying i {
  display: inline-block;
  transform-origin: 50% 10%;
  animation: practice-timer-alarm-sway 0.55s ease-in-out infinite;
}

@keyframes practice-timer-alarm-sway {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(14deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .practice-timer-fab-icon.is-swaying i {
    animation: none;
  }
}

.practice-timer-fab-body {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding-right: 4px;
  gap: 2px;
  opacity: 0;
  transform: translateX(-8px);
  pointer-events: none;
  transition:
    opacity 0.25s ease 0.05s,
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.05s;
}

.practice-timer-fab:hover .practice-timer-fab-body,
.practice-timer-fab:focus-within .practice-timer-fab-body {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.practice-timer-fab-edit {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.practice-timer-fab-edit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0.15rem -0.65rem 0;
  min-height: 42px;
}

.practice-timer-fab-panel-row {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: 0.4rem;
  align-items: center;
}

.practice-timer-fab-field-label {
  margin: 0;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}

.practice-timer-fab-panel-actions {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  padding-right: 0.35rem;
}

.practice-timer-fab-time {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  letter-spacing: 0.03em;
  padding-right: 2px;
}

.practice-timer-fab-off-hint {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}

.practice-timer-fab-action {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  background: rgba(var(--bs-secondary-rgb), 0.12);
  color: var(--bs-body-color);
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.practice-timer-fab-action:hover:not(:disabled) {
  background: rgba(var(--bs-secondary-rgb), 0.22);
}

.practice-timer-fab-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.practice-timer-fab-action--primary {
  background: var(--bs-primary);
  color: #fff;
}

.practice-timer-fab-action--primary:hover:not(:disabled) {
  background: var(--bs-primary-border-subtle, #0b5ed7);
}

:global([data-bs-theme="dark"]) .practice-timer-fab-inner {
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
}

:global([data-bs-theme="dark"]) .practice-timer-fab:hover .practice-timer-fab-inner,
:global([data-bs-theme="dark"]) .practice-timer-fab:focus-within .practice-timer-fab-inner,
:global([data-bs-theme="dark"]) .practice-timer-fab.is-editing .practice-timer-fab-inner {
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55);
}
</style>

<style>
.practice-timer-lock-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  cursor: pointer;
  transition: background-color 0.35s ease;
}

.practice-timer-lock-overlay.is-visible {
  background: color-mix(in srgb, var(--bs-danger) 82%, #000 18%);
}

.practice-timer-lock-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  text-align: center;
  opacity: 0;
  transform: scale(0.92);
  pointer-events: none;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.practice-timer-lock-overlay.is-visible .practice-timer-lock-content {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.practice-timer-lock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: clamp(3.5rem, 12vw, 5rem);
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.practice-timer-lock-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.practice-timer-lock-title {
  margin: 0;
  color: #fff;
  font-size: clamp(1.15rem, 3.5vw, 1.65rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}

.practice-timer-lock-overlay.is-reduced-motion,
.practice-timer-lock-overlay.is-reduced-motion .practice-timer-lock-content {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .practice-timer-lock-overlay,
  .practice-timer-lock-content {
    transition: none !important;
  }

  .practice-timer-lock-overlay.is-visible .practice-timer-lock-content {
    transform: none;
  }
}
</style>
