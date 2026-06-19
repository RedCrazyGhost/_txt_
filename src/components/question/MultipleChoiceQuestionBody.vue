<script setup>
import { computed } from "vue";
import { judgeAnswerTrue } from "../../utils/questions";

const props = defineProps({
  question: { type: Object, required: true },
  qindex: { type: Number, required: true }
});

const emit = defineEmits(["slotChange"]);

const selectedKeys = computed(() =>
  String(props.question.results?.[0] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

function optionInputId(qindex, optionKey) {
  return `question-${qindex}-option-${optionKey}`;
}

function isSelected(optionKey) {
  return selectedKeys.value.includes(optionKey);
}

function optionClass(optionKey) {
  if (!isSelected(optionKey)) return "multiple-choice-option";
  return judgeAnswerTrue(props.question, 0)
    ? "multiple-choice-option is-correct"
    : "multiple-choice-option is-wrong";
}

function toggleOption(optionKey) {
  const next = new Set(selectedKeys.value);
  if (next.has(optionKey)) {
    next.delete(optionKey);
  } else {
    next.add(optionKey);
  }
  props.question.results[0] = [...next].sort().join(",");
  emit("slotChange", 0);
}
</script>

<template>
  <p style="white-space: pre-line" class="card-text mb-3">{{ question.stem }}</p>
  <div class="multiple-choice-options">
    <label
      v-for="option in question.options"
      :key="`option-${qindex}-${option.key}`"
      :class="optionClass(option.key)"
      :for="optionInputId(qindex, option.key)"
    >
      <input
        class="form-check-input mt-1 flex-shrink-0"
        type="checkbox"
        :id="optionInputId(qindex, option.key)"
        :checked="isSelected(option.key)"
        @change="toggleOption(option.key)"
      />
      <span class="multiple-choice-option-text">
        <strong>{{ option.key }}.</strong>
        <span style="white-space: pre-line">{{ option.text }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.multiple-choice-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.multiple-choice-option {
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

.multiple-choice-option:hover {
  background: color-mix(in srgb, var(--bs-body-color) 5%, transparent);
}

.multiple-choice-option.is-correct {
  border-color: var(--bs-success);
  background: rgba(var(--bs-success-rgb), 0.08);
  color: var(--bs-success);
  font-weight: 600;
}

.multiple-choice-option.is-wrong {
  border-color: var(--bs-danger);
  background: rgba(var(--bs-danger-rgb), 0.08);
  color: var(--bs-danger);
  font-weight: 600;
}
</style>
