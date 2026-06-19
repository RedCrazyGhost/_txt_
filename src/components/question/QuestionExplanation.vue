<script setup>
import { computed } from "vue";
import { formatCorrectAnswers } from "../../models/question/feedback";

const props = defineProps({
  question: { type: Object, required: true },
  /** 偷看答案时为 true，强制展示解析区 */
  peeking: { type: Boolean, default: false }
});

const hasExplanation = computed(() => Boolean(props.question.explanation?.trim()));

const showCorrectAnswer = computed(() => {
  if (props.question.MD5) return false;
  if (hasExplanation.value) return false;
  return formatCorrectAnswers(props.question).length > 0;
});
</script>

<template>
  <div class="question-explanation alert alert-warning mb-0 mt-3" role="status">
    <div class="fw-semibold mb-1">{{ peeking ? "答案与解析" : "解析" }}</div>
    <p v-if="hasExplanation" class="mb-0 explanation-text">{{ question.explanation }}</p>
    <p v-else-if="showCorrectAnswer" class="mb-0 correct-answer-text">
      <span class="text-muted">正确答案：</span>{{ formatCorrectAnswers(question) }}
    </p>
  </div>
</template>

<style scoped>
.explanation-text,
.correct-answer-text {
  white-space: pre-line;
}

:global([data-bs-theme="dark"]) .question-explanation {
  --bs-alert-bg: #422006;
  --bs-alert-border-color: #854d0e;
  --bs-alert-color: #fde68a;
  background-color: var(--bs-alert-bg);
  border-color: var(--bs-alert-border-color);
  color: var(--bs-alert-color);
}

:global([data-bs-theme="dark"]) .question-explanation .text-muted {
  color: #fcd34d !important;
}
</style>
