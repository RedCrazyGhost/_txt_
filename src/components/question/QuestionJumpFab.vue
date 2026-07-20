<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    total: number;
    unansweredIndexes?: number[];
  }>(),
  {
    unansweredIndexes: () => []
  }
);

const emit = defineEmits<{
  jump: [index: number];
}>();

const ERROR_HIDE_MS = 3000;

const value = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const nextUnansweredCursor = ref(0);
const errorMessage = ref("");
let errorHideTimer: ReturnType<typeof setTimeout> | null = null;

const hasUnanswered = computed(() => props.unansweredIndexes.length > 0);

function clearErrorHideTimer() {
  if (errorHideTimer) {
    clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
}

function showError(message: string) {
  clearErrorHideTimer();
  errorMessage.value = message;
  errorHideTimer = setTimeout(() => {
    errorMessage.value = "";
    errorHideTimer = null;
  }, ERROR_HIDE_MS);
}

watch(
  () => props.unansweredIndexes.join(","),
  () => {
    nextUnansweredCursor.value = 0;
  }
);

watch(value, () => {
  if (errorMessage.value) {
    clearErrorHideTimer();
    errorMessage.value = "";
  }
});

function submit() {
  const raw = String(value.value).trim();
  const num = Number.parseInt(raw, 10);

  if (!raw || !Number.isFinite(num)) {
    showError(`请输入 1–${props.total} 之间的题号`);
    inputRef.value?.focus();
    return;
  }

  if (num < 1 || num > props.total) {
    showError(`题号超出范围，请输入 1–${props.total}`);
    inputRef.value?.focus();
    return;
  }

  clearErrorHideTimer();
  errorMessage.value = "";
  emit("jump", num - 1);
  value.value = "";
  inputRef.value?.blur();
}

onUnmounted(clearErrorHideTimer);

function jumpNextUnanswered() {
  if (!props.unansweredIndexes.length) return;
  const index =
    props.unansweredIndexes[nextUnansweredCursor.value % props.unansweredIndexes.length];
  nextUnansweredCursor.value += 1;
  emit("jump", index);
}
</script>

<template>
  <div class="question-jump-fab">
    <div
      v-if="errorMessage"
      id="question-jump-fab-error-text"
      class="question-jump-fab-error"
      role="alert"
      aria-live="polite"
    >
      {{ errorMessage }}
    </div>
    <div class="question-jump-fab-inner">
      <span class="question-jump-fab-icon" aria-hidden="true">
        <i class="fas fa-crosshairs"></i>
      </span>
      <form class="question-jump-fab-form" novalidate @submit.prevent="submit">
        <input
          ref="inputRef"
          v-model="value"
          type="text"
          placeholder="题号"
          aria-label="跳转到题号"
          :aria-invalid="errorMessage ? 'true' : 'false'"
          :aria-describedby="errorMessage ? 'question-jump-fab-error-text' : undefined"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
        />
        <button type="submit" class="question-jump-fab-go" title="跳转" aria-label="跳转">
          <i class="fas fa-arrow-right"></i>
        </button>
        <button
          type="button"
          class="question-jump-fab-next"
          :disabled="!hasUnanswered"
          :title="hasUnanswered ? `下一未做，剩余 ${unansweredIndexes.length} 题` : '暂无未做题目'"
          aria-label="下一未做"
          @click="jumpNextUnanswered"
        >
          <i class="fas fa-step-forward"></i>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.question-jump-fab {
  position: fixed;
  bottom: var(--app-fab-bottom, 12px);
  left: calc(var(--app-fab-edge, 12px) + env(safe-area-inset-left, 0px));
  z-index: 1040;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
}

.question-jump-fab-error {
  max-width: min(240px, calc(100vw - 24px));
  padding: 0.45rem 0.65rem;
  border-radius: 0.5rem;
  background: var(--bs-danger);
  color: #fff;
  font-size: 0.8125rem;
  line-height: 1.35;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.question-jump-fab-inner {
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
    box-shadow 0.25s ease;
}

.question-jump-fab:hover .question-jump-fab-inner,
.question-jump-fab:focus-within .question-jump-fab-inner {
  width: 196px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}

.question-jump-fab-icon {
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-secondary);
}

.question-jump-fab-form {
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

.question-jump-fab:hover .question-jump-fab-form,
.question-jump-fab:focus-within .question-jump-fab-form {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.question-jump-fab-form input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  padding: 0 2px 0 0;
  color: var(--bs-body-color);
}

.question-jump-fab-form input::-webkit-outer-spin-button,
.question-jump-fab-form input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.question-jump-fab-form input[type="text"] {
  -moz-appearance: textfield;
}

.question-jump-fab-form input:invalid {
  box-shadow: none;
}

.question-jump-fab-go,
.question-jump-fab-next {
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
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.question-jump-fab-go {
  background: var(--bs-primary);
  color: #fff;
}

.question-jump-fab-go:hover {
  background: var(--bs-primary-border-subtle, #0b5ed7);
}

.question-jump-fab-next {
  background: rgba(var(--bs-warning-rgb), 0.18);
  color: var(--bs-warning-text-emphasis, #664d03);
}

.question-jump-fab-next:hover:not(:disabled) {
  background: rgba(var(--bs-warning-rgb), 0.32);
}

.question-jump-fab-next:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

:global([data-bs-theme="dark"]) .question-jump-fab-inner {
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
}

:global([data-bs-theme="dark"]) .question-jump-fab:hover .question-jump-fab-inner,
:global([data-bs-theme="dark"]) .question-jump-fab:focus-within .question-jump-fab-inner {
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.55);
}
</style>
