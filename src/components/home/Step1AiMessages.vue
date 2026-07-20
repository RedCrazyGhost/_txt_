<script setup lang="ts">
import { ref } from "vue";
import Step1AiMessageBubble from "./Step1AiMessageBubble.vue";
import type { AiPanelMessage, LoadingPhase } from "../../types/step1AiPanel";
import type { WriteMode } from "../../types/step1AiPanel";
import type { Verdict } from "../../services/ai/reviewGeneratedAnswers";

defineProps<{
  messages: AiPanelMessage[];
  loading: boolean;
  loadingPhase: LoadingPhase;
  showExamples: boolean;
  isFullscreen: boolean;
  examplePrompts: readonly string[];
  formatQuestionTextForMessage: (msg: AiPanelMessage, txt: string) => string;
  verdictLabel: (verdict: Verdict) => string;
  isAllQuestionsSelected: (msg: AiPanelMessage) => boolean;
}>();

const emit = defineEmits<{
  toggleFullscreen: [];
  applyExample: [text: string];
  toggleAllQuestions: [msg: AiPanelMessage];
  applyMessageToTxts: [msg: AiPanelMessage, mode: WriteMode];
}>();

const messagesEl = ref<HTMLElement | null>(null);

defineExpose({ messagesEl });
</script>

<template>
  <div v-if="showExamples" class="step1-ai-dialog-header">
    <p class="step1-ai-dialog-empty-title mb-0">
      <i class="fas fa-comment-dots step1-ai-dialog-empty-icon" aria-hidden="true"></i>
      描述你想要的题集，或试试示例：
    </p>
    <button
      type="button"
      class="step1-ai-fullscreen-btn"
      :aria-label="isFullscreen ? '退出全屏' : '全屏'"
      :title="isFullscreen ? '退出全屏' : '全屏'"
      @click="emit('toggleFullscreen')"
    >
      <i
        class="fas"
        :class="isFullscreen ? 'fa-compress' : 'fa-expand'"
        aria-hidden="true"
      ></i>
    </button>
  </div>
  <div
    ref="messagesEl"
    class="step1-ai-dialog-messages"
    :class="{ 'has-overlay-fs': !showExamples, 'is-fullscreen-messages': isFullscreen }"
    role="log"
    aria-live="polite"
    aria-relevant="additions"
  >
    <button
      v-if="!showExamples"
      type="button"
      class="step1-ai-fullscreen-btn step1-ai-fullscreen-overlay"
      :aria-label="isFullscreen ? '退出全屏' : '全屏'"
      :title="isFullscreen ? '退出全屏' : '全屏'"
      @click="emit('toggleFullscreen')"
    >
      <i
        class="fas"
        :class="isFullscreen ? 'fa-compress' : 'fa-expand'"
        aria-hidden="true"
      ></i>
    </button>
    <div v-if="showExamples" class="step1-ai-dialog-empty">
      <div class="step1-ai-examples">
        <button
          v-for="example in examplePrompts"
          :key="example"
          type="button"
          class="step1-ai-example-chip"
          @click="emit('applyExample', example)"
        >
          <i class="fas fa-wand-magic-sparkles step1-ai-example-chip-icon" aria-hidden="true"></i>
          <span>{{ example }}</span>
        </button>
      </div>
    </div>

    <Step1AiMessageBubble
      v-for="(msg, index) in messages"
      :key="`msg-${index}`"
      :msg="msg"
      :index="index"
      :loading="loading"
      :format-question-text-for-message="formatQuestionTextForMessage"
      :verdict-label="verdictLabel"
      :is-all-questions-selected="isAllQuestionsSelected"
      @toggle-all-questions="emit('toggleAllQuestions', $event)"
      @apply-message-to-txts="(m, mode) => emit('applyMessageToTxts', m, mode)"
    />

    <div v-if="loading" class="step1-ai-dialog-bubble is-assistant is-loading">
      <span class="step1-ai-dialog-role">AI</span>
      <p class="step1-ai-dialog-text mb-0">
        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        {{ loadingPhase === "review" ? "正在复核答案…" : "正在生成题目…" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.step1-ai-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.25rem;
  background-color: var(--bs-body-bg);
  flex-shrink: 0;
}

.step1-ai-fullscreen-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background-color: var(--bs-tertiary-bg);
  color: var(--bs-secondary-color);
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.step1-ai-fullscreen-overlay {
  position: absolute;
  top: 0.35rem;
  right: 0.5rem;
  z-index: 2;
}

.step1-ai-fullscreen-btn:hover {
  color: var(--bs-body-color);
  border-color: rgba(var(--bs-primary-rgb), 0.45);
  background-color: var(--bs-body-bg);
}

.step1-ai-dialog-messages {
  position: relative;
  flex: 1;
  min-height: 11rem;
  max-height: min(22rem, 45vh);
  overflow-y: auto;
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.step1-ai-dialog-messages.is-fullscreen-messages {
  flex: 1;
  min-height: 0;
  max-height: none;
}

.step1-ai-dialog-messages.has-overlay-fs {
  padding-top: 0.875rem;
  padding-right: 2.75rem;
}

.step1-ai-dialog-empty-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  color: var(--bs-secondary-color);
}

.step1-ai-dialog-empty-icon {
  color: var(--bs-primary);
  opacity: 0.85;
}

.step1-ai-examples {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.step1-ai-example-chip {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  text-align: left;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background-color: var(--bs-body-bg);
  color: var(--bs-body-color);
  font-size: 0.8125rem;
  line-height: 1.4;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.step1-ai-example-chip-icon {
  flex-shrink: 0;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--bs-primary);
  opacity: 0.75;
}

.step1-ai-example-chip:hover {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  background-color: rgba(var(--bs-primary-rgb), 0.04);
  box-shadow: 0 1px 3px rgba(var(--bs-primary-rgb), 0.08);
}

.step1-ai-example-chip:hover .step1-ai-example-chip-icon {
  opacity: 1;
}

.step1-ai-dialog-bubble {
  max-width: 88%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

.step1-ai-dialog-bubble.is-assistant {
  align-self: flex-start;
  background-color: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
  color: var(--bs-body-color);
  border-bottom-left-radius: 0.2rem;
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
</style>
