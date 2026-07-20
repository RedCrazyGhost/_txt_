<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAiConfig } from "../../composables/useAiConfig";
import { useStep1AiFullscreen } from "../../composables/useStep1AiFullscreen";
import { useStep1AiGeneration } from "../../composables/useStep1AiGeneration";
import { REFERENCE_FILE_ACCEPT, type ReferenceFile } from "../../services/ai/referenceFile";
import { EXAMPLE_PROMPTS, type AiPanelMessage, type LoadingPhase, type WriteMode } from "../../types/step1AiPanel";
import Step1AiComposer from "./Step1AiComposer.vue";
import Step1AiMessages from "./Step1AiMessages.vue";
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

const messagesComponent = ref<{ messagesEl: HTMLElement | null } | null>(null);
const composerComponent = ref<{ promptEl: HTMLTextAreaElement | null } | null>(null);

const messagesEl = computed(() => messagesComponent.value?.messagesEl ?? null);
const promptEl = computed(() => composerComponent.value?.promptEl ?? null);

const aiConfig = useAiConfig({
  persistOnFieldChange: false,
  disabled: () => loading.value
});

const { isFullscreen, toggleFullscreen } = useStep1AiFullscreen();

const generation = useStep1AiGeneration({
  persist: aiConfig.persist,
  apiKey: aiConfig.apiKey,
  refreshBalance: aiConfig.refreshBalance,
  messages,
  loading,
  loadingPhase,
  settingsOpen,
  userPrompt,
  referenceFiles,
  composerError,
  defaultWriteMode,
  messagesEl,
  promptEl,
  referenceInputEl
});

const showExamples = computed(() => messages.value.length === 0 && !loading.value);

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function handleCredentialInput() {
  aiConfig.onCredentialInput();
  generation.clearComposerError();
}

onMounted(() => {
  const config = aiConfig.initFromStorage();
  settingsOpen.value = !config.apiKey?.trim();
});

watch(promptEl, (el) => {
  if (el) generation.autoResizePrompt();
});
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
        :api-key-configured="aiConfig.apiKeyConfigured.value"
        :thinking-enabled="aiConfig.thinkingEnabled.value"
        :reference-files="referenceFiles"
        :is-deep-seek="aiConfig.isDeepSeek.value"
        :balance-text="aiConfig.balanceText.value"
        :composer-error="composerError"
        @toggle-settings="toggleSettings"
        @toggle-thinking="aiConfig.toggleThinking"
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
            :base-url="aiConfig.baseURL.value"
            :api-key="aiConfig.apiKey.value"
            :model="aiConfig.model.value"
            :thinking-enabled="aiConfig.thinkingEnabled.value"
            :reasoning-effort="aiConfig.reasoningEffort.value"
            :available-models="aiConfig.availableModels.value"
            :models-loading="aiConfig.modelsLoading.value"
            :models-error="aiConfig.modelsError.value"
            :balance-text="aiConfig.balanceText.value"
            :base-url-placeholder="aiConfig.baseURLPlaceholder.value"
            :model-placeholder="aiConfig.modelPlaceholder.value"
            :is-deep-seek="aiConfig.isDeepSeek.value"
            :can-fetch-models="aiConfig.canFetchModels.value"
            @update:base-url="aiConfig.baseURL.value = $event"
            @update:api-key="aiConfig.apiKey.value = $event"
            @update:model="aiConfig.model.value = $event"
            @update:thinking-enabled="aiConfig.thinkingEnabled.value = $event"
            @update:reasoning-effort="aiConfig.reasoningEffort.value = $event"
            @credential-input="handleCredentialInput"
            @field-persist="aiConfig.onFieldPersist"
            @fetch-models="aiConfig.fetchModels"
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
