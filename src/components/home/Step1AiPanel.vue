<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAiConfig } from "../../composables/useAiConfig";
import { useStep1AiFullscreen } from "../../composables/useStep1AiFullscreen";
import { useStep1AiGeneration } from "../../composables/useStep1AiGeneration";
import { REFERENCE_FILE_ACCEPT, type ReferenceFile } from "../../services/ai/referenceFile";
import { EXAMPLE_PROMPTS, type AiPanelMessage, type LoadingPhase, type WriteMode } from "../../types/step1AiPanel";
import Step1AiComposer, { type Step1AiComposerExpose } from "./Step1AiComposer.vue";
import Step1AiMessages, { type Step1AiMessagesExpose } from "./Step1AiMessages.vue";
import Step1AiSettingsSection from "./Step1AiSettingsSection.vue";

const userPrompt = ref("");
const messages = ref<AiPanelMessage[]>([]);
const defaultWriteMode = ref<WriteMode>("replace");
const loading = ref(false);
const loadingPhase = ref<LoadingPhase>("");
const composerError = ref("");
const referenceFiles = ref<ReferenceFile[]>([]);
const settingsOpen = ref(false);
const referenceInputEl = ref<HTMLInputElement | null>(null);

const messagesComponent = ref<Step1AiMessagesExpose | null>(null);
const composerComponent = ref<Step1AiComposerExpose | null>(null);

const {
  baseURL: baseUrl,
  apiKey,
  model,
  thinkingEnabled,
  reasoningEffort,
  availableModels,
  modelsLoading,
  modelsError,
  balanceText,
  baseURLPlaceholder: baseUrlPlaceholder,
  modelPlaceholder,
  apiKeyConfigured,
  isDeepSeek,
  canFetchModels,
  persist,
  onCredentialInput,
  onFieldPersist,
  toggleThinking,
  initFromStorage,
  fetchModels,
  refreshBalance
} = useAiConfig({
  persistOnFieldChange: false,
  disabled: () => loading.value
});

const { isFullscreen, toggleFullscreen } = useStep1AiFullscreen();

const generation = useStep1AiGeneration({
  persist,
  apiKey,
  refreshBalance,
  messages,
  loading,
  loadingPhase,
  settingsOpen,
  userPrompt,
  referenceFiles,
  composerError,
  defaultWriteMode,
  getMessagesEl: () => {
    const exposed = messagesComponent.value as Step1AiMessagesExpose | null;
    return exposed?.messagesEl.value ?? null;
  },
  getPromptEl: () => {
    const exposed = composerComponent.value as Step1AiComposerExpose | null;
    return exposed?.promptEl.value ?? null;
  },
  referenceInputEl
});

const showExamples = computed(() => messages.value.length === 0 && !loading.value);

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function handleCredentialInput() {
  onCredentialInput();
  generation.clearComposerError();
}

onMounted(() => {
  const config = initFromStorage();
  settingsOpen.value = !config.apiKey?.trim();
});

watch(
  () => {
    const exposed = composerComponent.value as Step1AiComposerExpose | null;
    return exposed?.promptEl.value ?? null;
  },
  (el) => {
    if (el) generation.autoResizePrompt();
  }
);
</script>

<template>
  <div class="step1-ai-panel">
    <div class="step1-ai-dialog" :class="{ 'is-fullscreen': isFullscreen }">
      <Step1AiMessages
        ref="messagesComponent"
        :messages="messages"
        :loading="loading"
        :loading-phase="loadingPhase"
        :show-examples="showExamples"
        :is-fullscreen="isFullscreen"
        :example-prompts="EXAMPLE_PROMPTS"
        :format-question-text-for-message="generation.formatQuestionTextForMessage"
        :verdict-label="generation.verdictLabel"
        :is-all-questions-selected="generation.isAllQuestionsSelected"
        @toggle-fullscreen="toggleFullscreen"
        @apply-example="generation.applyExample"
        @toggle-all-questions="generation.toggleAllQuestions"
        @apply-message-to-txts="generation.applyMessageToTxts"
      />

      <Step1AiComposer
        ref="composerComponent"
        v-model:user-prompt="userPrompt"
        :loading="loading"
        :settings-open="settingsOpen"
        :api-key-configured="apiKeyConfigured"
        :thinking-enabled="thinkingEnabled"
        :reference-files="referenceFiles"
        :is-deep-seek="isDeepSeek"
        :balance-text="balanceText"
        :composer-error="composerError"
        @toggle-settings="toggleSettings"
        @toggle-thinking="toggleThinking"
        @trigger-reference-picker="generation.triggerReferencePicker"
        @reference-change="generation.handleReferenceChange"
        @remove-reference-file="generation.removeReferenceFile"
        @generate="generation.handleGenerate"
        @prompt-keydown="generation.handlePromptKeydown"
        @auto-resize-prompt="generation.autoResizePrompt"
        @clear-composer-error="generation.clearComposerError"
      >
        <template #reference-input>
          <input
            ref="referenceInputEl"
            type="file"
            class="d-none"
            multiple
            :accept="REFERENCE_FILE_ACCEPT"
            :disabled="loading"
            @change="generation.handleReferenceChange"
          />
        </template>
        <template #settings>
          <Step1AiSettingsSection
            v-show="settingsOpen"
            :disabled="loading"
            v-model:base-url="baseUrl"
            v-model:api-key="apiKey"
            v-model:model="model"
            v-model:thinking-enabled="thinkingEnabled"
            v-model:reasoning-effort="reasoningEffort"
            :available-models="availableModels"
            :models-loading="modelsLoading"
            :models-error="modelsError"
            :balance-text="balanceText"
            :base-url-placeholder="baseUrlPlaceholder"
            :model-placeholder="modelPlaceholder"
            :is-deep-seek="isDeepSeek"
            :can-fetch-models="canFetchModels"
            @credential-input="handleCredentialInput"
            @field-persist="onFieldPersist"
            @fetch-models="fetchModels"
          />
        </template>
      </Step1AiComposer>
    </div>
  </div>
</template>

<style scoped>
.step1-ai-panel {
  display: flex;
  flex-direction: column;
}

.step1-ai-dialog {
  position: relative;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.625rem;
  background-color: var(--bs-body-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.step1-ai-dialog.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1040;
  width: 100vw;
  height: 100dvh;
  border: none;
  border-radius: 0;
}
</style>
