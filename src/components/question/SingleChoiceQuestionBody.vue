<script setup lang="ts">
import type { JudgmentQuestion, SingleChoiceQuestion } from "../../models/question/types";
import { judgeAnswerTrue } from "../../utils/questions";

type SingleChoiceQuestionWithResults = (SingleChoiceQuestion | JudgmentQuestion) & {
  results: Array<string | undefined>;
};

defineProps<{
  question: SingleChoiceQuestionWithResults;
  qindex: number;
}>();

const emit = defineEmits<{
  slotChange: [index: number];
}>();

function optionInputId(qindex: number, optionKey: string) {
  return `question-${qindex}-option-${optionKey}`;
}

function optionClass(question: SingleChoiceQuestionWithResults, optionKey: string) {
  const selected = question.results?.[0] === optionKey;
  if (!selected) return "single-choice-option";
  return judgeAnswerTrue(question, 0)
    ? "single-choice-option is-correct"
    : "single-choice-option is-wrong";
}
</script>

<template>
  <p style="white-space: pre-line" class="card-text mb-3">{{ question.stem }}</p>
  <div class="single-choice-options">
    <label
      v-for="option in question.options"
      :key="`option-${qindex}-${option.key}`"
      :class="optionClass(question, option.key)"
      :for="optionInputId(qindex, option.key)"
    >
      <input
        class="form-check-input mt-1 flex-shrink-0"
        type="radio"
        :name="`question-${qindex}`"
        :id="optionInputId(qindex, option.key)"
        :value="option.key"
        v-model="question.results[0]"
        @change="emit('slotChange', 0)"
      />
      <span class="single-choice-option-text">
        <strong>{{ option.key }}.</strong>
        <span style="white-space: pre-line">{{ option.text }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.single-choice-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.single-choice-option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--bs-border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  margin-bottom: 0;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.single-choice-option:hover {
  background: color-mix(in srgb, var(--bs-body-color) 5%, transparent);
}

.single-choice-option.is-correct {
  border-color: var(--bs-success);
  background: rgba(var(--bs-success-rgb), 0.08);
  color: var(--bs-success);
  font-weight: 600;
}

.single-choice-option.is-wrong {
  border-color: var(--bs-danger);
  background: rgba(var(--bs-danger-rgb), 0.08);
  color: var(--bs-danger);
  font-weight: 600;
}
</style>
