<script setup>
import { onUnmounted } from "vue";
import { judgeAnswerTrue } from "../../utils/questions";

defineProps({
  question: { type: Object, required: true },
  qindex: { type: Number, required: true }
});

const emit = defineEmits(["slotChange"]);

const PROGRESS_DEBOUNCE_MS = 150;
const progressTimers = new Map();

function blankIndex(tindex) {
  return (tindex - 1) / 2;
}

function inputWidth(question, index) {
  const custom = question.answerslength?.[index];
  if (typeof custom === "number" && custom > 0) {
    return `${Math.max(custom, 48)}px`;
  }
  return "4rem";
}

function inputClass(question, index) {
  const result = question.results?.[index];
  const attempted = result !== undefined && result !== null && String(result).trim() !== "";
  if (!attempted) return "fill-blank-input";
  return judgeAnswerTrue(question, index) ? "fill-blank-input is-correct" : "fill-blank-input is-wrong";
}

function emitSlotChange(index) {
  emit("slotChange", index);
}

function scheduleProgressUpdate(index) {
  const existing = progressTimers.get(index);
  if (existing) clearTimeout(existing);

  progressTimers.set(
    index,
    setTimeout(() => {
      progressTimers.delete(index);
      emitSlotChange(index);
    }, PROGRESS_DEBOUNCE_MS)
  );
}

function flushProgressUpdate(index) {
  const existing = progressTimers.get(index);
  if (existing) clearTimeout(existing);
  progressTimers.delete(index);
  emitSlotChange(index);
}

onUnmounted(() => {
  progressTimers.forEach((timer) => clearTimeout(timer));
  progressTimers.clear();
});
</script>

<template>
  <div class="fill-blank-body">
    <p class="fill-blank-text mb-0">
      <template v-for="(text, tindex) in question.texts" :key="`text-${qindex}-${tindex}`">
        <span v-if="tindex % 2 === 0" class="fill-blank-segment">{{ text }}</span>
        <span v-else class="fill-blank-slot">
          <input
            type="text"
            :class="inputClass(question, blankIndex(tindex))"
            v-model="question.results[blankIndex(tindex)]"
            @input="scheduleProgressUpdate(blankIndex(tindex))"
            @blur="flushProgressUpdate(blankIndex(tindex))"
            :style="{ width: inputWidth(question, blankIndex(tindex)) }"
            :aria-label="`第 ${blankIndex(tindex) + 1} 空`"
            autocomplete="off"
            spellcheck="false"
          />
        </span>
      </template>
    </p>
  </div>
</template>

<style scoped>
.fill-blank-body {
  line-height: 2;
}

.fill-blank-text {
  white-space: pre-line;
  font-size: 1rem;
}

.fill-blank-segment {
  vertical-align: baseline;
}

.fill-blank-slot {
  display: inline-flex;
  align-items: center;
  vertical-align: baseline;
  margin: 0 0.2rem;
}

.fill-blank-input {
  display: inline-block;
  vertical-align: baseline;
  border: none;
  border-bottom: 2px solid var(--bs-border-color);
  border-radius: 0;
  background: color-mix(in srgb, var(--bs-body-color) 6%, transparent);
  padding: 0.1rem 0.4rem 0.15rem;
  min-width: 3rem;
  box-shadow: none;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.fill-blank-input:focus {
  outline: none;
  border-bottom-color: var(--bs-body-color);
  background: color-mix(in srgb, var(--bs-body-color) 10%, transparent);
  box-shadow: none;
}

.fill-blank-input.is-correct {
  border-bottom-color: var(--bs-success);
  background: rgba(var(--bs-success-rgb), 0.08);
  color: var(--bs-success);
  font-weight: 600;
}

.fill-blank-input.is-wrong {
  border-bottom-color: var(--bs-danger);
  background: rgba(var(--bs-danger-rgb), 0.08);
  color: var(--bs-danger);
  font-weight: 600;
}
</style>
