<script setup lang="ts">
import type { AiPanelMessage, WriteMode } from "../../types/step1AiPanel";
import type { Verdict } from "../../services/ai/reviewGeneratedAnswers";

defineProps<{
  msg: AiPanelMessage;
  loading: boolean;
  index: number;
  formatQuestionTextForMessage: (msg: AiPanelMessage, txt: string) => string;
  verdictLabel: (verdict: Verdict) => string;
  isAllQuestionsSelected: (msg: AiPanelMessage) => boolean;
}>();

const emit = defineEmits<{
  toggleAllQuestions: [msg: AiPanelMessage];
  applyMessageToTxts: [msg: AiPanelMessage, mode: WriteMode];
}>();
</script>

<template>
  <div
    class="step1-ai-dialog-bubble"
    :class="[
      msg.role === 'user' ? 'is-user' : 'is-assistant',
      msg.variant !== 'default' ? `is-${msg.variant}` : ''
    ]"
  >
    <span class="step1-ai-dialog-role">{{ msg.role === "user" ? "我" : "AI" }}</span>

    <div v-if="msg.questions?.length" class="step1-ai-question-list">
      <label class="step1-ai-question-select-all">
        <input
          type="checkbox"
          class="form-check-input"
          :checked="isAllQuestionsSelected(msg)"
          :disabled="loading"
          @change="emit('toggleAllQuestions', msg)"
        />
        <span>全选</span>
      </label>
      <label
        v-for="(question, qIndex) in msg.questions"
        :key="`q-${index}-${qIndex}`"
        class="step1-ai-question-item"
        :class="{ 'is-selected': msg.selected?.[qIndex] !== false }"
      >
        <input
          v-model="msg.selected[qIndex]"
          type="checkbox"
          class="form-check-input"
          :disabled="loading"
        />
        <div class="step1-ai-question-body">
          <div class="step1-ai-question-head">
            <span
              v-if="question.verdict"
              class="step1-ai-review-badge"
              :class="`is-${question.verdict}`"
              :title="question.reviewReason || ''"
            >{{ verdictLabel(question.verdict) }}</span>
            <span class="step1-ai-question-text">{{ formatQuestionTextForMessage(msg, question.txt) }}</span>
          </div>
          <p v-if="msg.showAnswers && question.answer" class="step1-ai-question-meta mb-0">
            <span class="step1-ai-question-meta-label">答案</span>{{ question.answer }}
          </p>
          <p v-if="msg.showExplanation && question.explanation" class="step1-ai-question-meta mb-0">
            <span class="step1-ai-question-meta-label">解析</span>{{ question.explanation }}
          </p>
          <p v-if="question.reviewReason" class="step1-ai-question-meta step1-ai-review-reason mb-0">
            <span class="step1-ai-question-meta-label">复核</span>{{ question.reviewReason }}
          </p>
        </div>
      </label>
    </div>

    <div v-if="msg.questions?.length" class="step1-ai-bubble-actions">
      <button
        type="button"
        class="btn btn-sm btn-outline-primary step1-ai-action-btn"
        :class="{ 'is-active': msg.writeMode === 'replace' }"
        :disabled="loading"
        @click="emit('applyMessageToTxts', msg, 'replace')"
      >
        替换 JSON
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary step1-ai-action-btn"
        :class="{ 'is-active': msg.writeMode === 'append' }"
        :disabled="loading"
        @click="emit('applyMessageToTxts', msg, 'append')"
      >
        追加 JSON
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary step1-ai-action-btn"
        :class="{ 'is-active': msg.showAnswers }"
        :aria-pressed="Boolean(msg.showAnswers)"
        :disabled="loading"
        @click="msg.showAnswers = !msg.showAnswers"
      >
        显示答案
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary step1-ai-action-btn"
        :class="{ 'is-active': msg.showExplanation }"
        :aria-pressed="Boolean(msg.showExplanation)"
        :disabled="loading"
        @click="msg.showExplanation = !msg.showExplanation"
      >
        显示解析
      </button>
    </div>
    <p
      v-if="msg.questions?.length"
      class="step1-ai-dialog-status small text-muted mb-0"
    >
      {{ msg.content }}
    </p>
    <p v-else class="step1-ai-dialog-text mb-0">{{ msg.content }}</p>
  </div>
</template>

<style scoped>
.step1-ai-bubble-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--bs-border-color);
}

.step1-ai-action-btn.is-active {
  color: #fff;
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
}

.step1-ai-dialog-bubble {
  max-width: 88%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

.step1-ai-dialog-bubble.is-user {
  align-self: flex-end;
  background-color: var(--bs-primary);
  color: #fff;
  border-bottom-right-radius: 0.2rem;
}

.step1-ai-dialog-bubble.is-assistant {
  align-self: flex-start;
  background-color: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  color: var(--bs-body-color);
  border-bottom-left-radius: 0.2rem;
}

.step1-ai-dialog-bubble.is-success {
  border-color: rgba(var(--bs-success-rgb), 0.45);
  background-color: rgba(var(--bs-success-rgb), 0.08);
}

.step1-ai-question-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.step1-ai-question-select-all {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
  cursor: pointer;
}

.step1-ai-question-item {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.4rem 0.45rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.45rem;
  background-color: var(--bs-body-bg);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.step1-ai-question-item.is-selected {
  border-color: rgba(var(--bs-primary-rgb), 0.45);
  background-color: rgba(var(--bs-primary-rgb), 0.05);
}

.step1-ai-question-item .form-check-input {
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.step1-ai-question-text {
  flex: 1;
  font-size: 0.8125rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.step1-ai-question-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.step1-ai-question-head {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

.step1-ai-review-badge {
  flex-shrink: 0;
  margin-top: 0.1rem;
  padding: 0.05rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.step1-ai-review-badge.is-pass {
  color: var(--bs-success);
  background-color: rgba(var(--bs-success-rgb), 0.12);
}

.step1-ai-review-badge.is-fail {
  color: var(--bs-danger);
  background-color: rgba(var(--bs-danger-rgb), 0.12);
}

.step1-ai-review-badge.is-uncertain {
  color: var(--bs-warning-text-emphasis, #997404);
  background-color: rgba(var(--bs-warning-rgb), 0.16);
}

.step1-ai-review-reason {
  color: var(--bs-secondary-color);
}

.step1-ai-question-meta {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--bs-secondary-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.step1-ai-question-meta-label {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.05rem 0.35rem;
  border-radius: 0.25rem;
  background: rgba(var(--bs-primary-rgb), 0.1);
  color: var(--bs-primary);
  font-size: 0.6875rem;
  font-weight: 600;
}

.step1-ai-dialog-bubble.is-error {
  border-color: rgba(var(--bs-danger-rgb), 0.45);
  background-color: rgba(var(--bs-danger-rgb), 0.08);
}

.step1-ai-dialog-role {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.7;
  margin-bottom: 0.15rem;
}

.step1-ai-dialog-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.step1-ai-dialog-status {
  margin-top: 0.35rem;
  white-space: pre-wrap;
  word-break: break-word;
}

[data-bs-theme="dark"] .step1-ai-dialog-bubble.is-success {
  background-color: rgba(var(--bs-success-rgb), 0.12);
}

[data-bs-theme="dark"] .step1-ai-dialog-bubble.is-error {
  background-color: rgba(var(--bs-danger-rgb), 0.12);
}
</style>
