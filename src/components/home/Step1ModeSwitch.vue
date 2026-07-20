<script setup lang="ts">
type Step1Mode = "manual" | "ai";

withDefaults(
  defineProps<{
    modelValue?: Step1Mode;
  }>(),
  {
    modelValue: "manual"
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: Step1Mode];
}>();

function select(mode: Step1Mode) {
  emit("update:modelValue", mode);
}
</script>

<template>
  <div
    class="step1-mode-switch"
    role="radiogroup"
    aria-label="Step 1 录入方式"
  >
    <button
      type="button"
      class="step1-mode-switch-btn"
      role="radio"
      :aria-checked="modelValue === 'manual'"
      :class="{ 'is-active': modelValue === 'manual' }"
      @click="select('manual')"
    >
      <i class="fas fa-pen step1-mode-switch-icon" aria-hidden="true"></i>
      <span>手动</span>
    </button>
    <button
      type="button"
      class="step1-mode-switch-btn"
      role="radio"
      :aria-checked="modelValue === 'ai'"
      :class="{ 'is-active': modelValue === 'ai' }"
      @click="select('ai')"
    >
      <i class="fas fa-robot step1-mode-switch-icon" aria-hidden="true"></i>
      <span>AI</span>
    </button>
  </div>
</template>

<style scoped>
.step1-mode-switch {
  display: inline-flex;
  padding: 0.2rem;
  gap: 0.15rem;
  border-radius: 0.5rem;
  border: 1px solid var(--bs-border-color);
  background-color: var(--bs-tertiary-bg);
}

.step1-mode-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.step1-mode-switch-btn:hover:not(.is-active) {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
}

.step1-mode-switch-btn.is-active {
  color: #fff;
  background-color: var(--bs-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.step1-mode-switch-btn:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.step1-mode-switch-icon {
  font-size: 0.8rem;
  opacity: 0.9;
}

[data-bs-theme="dark"] .step1-mode-switch-btn.is-active {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
</style>
