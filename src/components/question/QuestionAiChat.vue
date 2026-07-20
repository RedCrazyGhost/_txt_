<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { Question } from "../../models/question/types";
import { loadAiConfig, resolveAiConfig } from "../../services/ai/aiConfigStorage";
import { llmChatStream } from "../../services/ai/llmClient";
import type { ChatMessage } from "../../services/ai/prompts";
import { buildQuestionTutorMessages } from "../../services/ai/prompts";
import {
  clearSession,
  getSession,
  setSessionMessages,
  setSessionOpen
} from "../../services/ai/questionTutorSession";
import type { QuestionReportBankInfo } from "../../services/questionReport";

const WELCOME_TEXT =
  "我是本题 AI 助手。可以问我解题思路、考点或你的作答哪里有问题。";

type DisplayMessage = ChatMessage & { welcome?: boolean };

const props = withDefaults(
  defineProps<{
    question: Question;
    qindex: number;
    bankContext?: QuestionReportBankInfo;
    open?: boolean;
  }>(),
  {
    bankContext: () => ({}),
    open: false
  }
);

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const bankId = computed(() => props.bankContext?.bankId || "");
const userInput = ref("");
const loading = ref(false);
const errorText = ref("");
const messagesEl = ref<HTMLElement | null>(null);
const messages = ref<ChatMessage[]>([]);

const apiKeyConfigured = computed(() => Boolean(loadAiConfig().apiKey?.trim()));

const displayMessages = computed((): DisplayMessage[] => {
  if (messages.value.length) {
    return messages.value;
  }
  if (props.open) {
    return [{ role: "assistant", content: WELCOME_TEXT, welcome: true }];
  }
  return [];
});

function restoreSession() {
  const session = getSession(bankId.value, props.qindex);
  messages.value = Array.isArray(session.messages) ? [...session.messages] : [];
}

function persistMessages() {
  setSessionMessages(bankId.value, props.qindex, messages.value);
}

function persistOpen(value: boolean) {
  setSessionOpen(bankId.value, props.qindex, value);
}

watch(
  () => [bankId.value, props.qindex],
  () => {
    restoreSession();
    const session = getSession(bankId.value, props.qindex);
    if (session.open !== props.open) {
      emit("update:open", session.open);
    }
  },
  { immediate: true }
);

watch(
  () => props.open,
  (value) => {
    persistOpen(value);
    if (value) {
      scrollToBottom();
    }
  }
);

watch(
  messages,
  () => {
    persistMessages();
    scrollToBottom();
  },
  { deep: true }
);

async function scrollToBottom() {
  await nextTick();
  const el = messagesEl.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

function toggleOpen() {
  emit("update:open", !props.open);
}

function handleClear() {
  if (loading.value) return;
  messages.value = [];
  errorText.value = "";
  clearSession(bankId.value, props.qindex);
  persistOpen(props.open);
}

async function handleSend() {
  const text = userInput.value.trim();
  if (!text || loading.value) return;

  if (!apiKeyConfigured.value) {
    errorText.value = "请先在「设置」页填写 API Key。";
    return;
  }

  errorText.value = "";
  const history = messages.value.map((entry) => ({
    role: entry.role,
    content: entry.content
  }));

  messages.value.push({ role: "user", content: text });
  userInput.value = "";

  const assistantIndex = messages.value.length;
  messages.value.push({ role: "assistant", content: "" });
  loading.value = true;

  const config = resolveAiConfig(loadAiConfig());
  const requestMessages = buildQuestionTutorMessages({
    question: props.question,
    history,
    userText: text
  });

  const result = await llmChatStream({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
    messages: requestMessages,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    thinkingEnabled: config.thinkingEnabled,
    reasoningEffort: config.reasoningEffort,
    onContentDelta: (content) => {
      messages.value[assistantIndex] = { role: "assistant", content };
    }
  });

  loading.value = false;

  if (!result.ok) {
    messages.value.splice(assistantIndex, 1);
    errorText.value = result.message || "请求失败，请重试。";
    return;
  }

  messages.value[assistantIndex] = {
    role: "assistant",
    content: result.content
  };
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

defineExpose({ toggleOpen });
</script>

<template>
  <div
    class="question-ai-slide"
    :class="{ 'question-ai-slide--open': open }"
  >
    <div class="question-ai-slide__inner">
      <div class="question-ai-panel">
        <div class="question-ai-panel__header">
          <span class="question-ai-panel__title">
            <i class="fas fa-robot" aria-hidden="true"></i>
            AI 对话
          </span>
          <button
            type="button"
            class="btn btn-link btn-sm question-ai-clear-btn"
            :disabled="loading || !messages.length"
            @click="handleClear"
          >
            清空
          </button>
        </div>

        <div
          ref="messagesEl"
          class="question-ai-messages"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div
            v-for="(msg, index) in displayMessages"
            :key="`msg-${index}`"
            class="question-ai-message"
            :class="{
              'question-ai-message--user': msg.role === 'user',
              'question-ai-message--assistant': msg.role === 'assistant',
              'question-ai-message--welcome': msg.welcome
            }"
          >
            <div class="question-ai-message__bubble">
              {{ msg.content }}
              <span
                v-if="loading && index === displayMessages.length - 1 && msg.role === 'assistant' && !msg.content"
                class="question-ai-typing"
              >…</span>
            </div>
          </div>
        </div>

        <p v-if="!apiKeyConfigured" class="question-ai-hint small text-warning mb-2">
          未配置 API Key。请前往
          <router-link to="/settings">设置</router-link>
          填写 OpenAI Base URL 与 API Key。
        </p>

        <p v-if="errorText" class="question-ai-error small text-danger mb-2" role="alert">
          {{ errorText }}
        </p>

        <div class="question-ai-composer">
          <textarea
            v-model="userInput"
            class="form-control form-control-sm question-ai-input"
            rows="2"
            placeholder="输入你的问题…"
            :disabled="loading"
            @keydown="handleKeydown"
          />
          <button
            type="button"
            class="btn btn-primary btn-sm question-ai-send"
            :disabled="loading || !userInput.trim()"
            @click="handleSend"
          >
            <i class="fas fa-paper-plane" aria-hidden="true"></i>
            <span class="visually-hidden">发送</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-ai-slide {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.question-ai-slide--open {
  grid-template-rows: 1fr;
}

.question-ai-slide__inner {
  overflow: hidden;
}

.question-ai-panel {
  margin-top: 0.75rem;
  padding: 0.65rem 0.75rem 0.8rem;
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  background: var(--bs-tertiary-bg);
}

.question-ai-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.question-ai-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--bs-primary);
}

.question-ai-clear-btn {
  padding: 0;
  font-size: 0.75rem;
  text-decoration: none;
}

.question-ai-messages {
  max-height: 18rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
  padding: 0.25rem 0.1rem;
}

.question-ai-message {
  display: flex;
}

.question-ai-message--user {
  justify-content: flex-end;
}

.question-ai-message--assistant {
  justify-content: flex-start;
}

.question-ai-message__bubble {
  max-width: 92%;
  padding: 0.45rem 0.65rem;
  border-radius: 0.65rem;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.question-ai-message--user .question-ai-message__bubble {
  background: var(--bs-primary);
  color: var(--bs-white);
}

.question-ai-message--assistant .question-ai-message__bubble {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  color: var(--bs-body-color);
}

.question-ai-message--welcome .question-ai-message__bubble {
  border-style: dashed;
  color: var(--bs-secondary-color);
}

.question-ai-typing {
  display: inline-block;
  animation: question-ai-blink 1s step-end infinite;
}

.question-ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}

.question-ai-input {
  flex: 1;
  resize: vertical;
  min-height: 2.5rem;
  max-height: 6rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

.question-ai-send {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@keyframes question-ai-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .question-ai-slide {
    transition: none;
  }

  .question-ai-typing {
    animation: none;
  }
}
</style>
