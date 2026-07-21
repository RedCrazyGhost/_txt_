<script setup lang="ts">
import { onMounted, toRef, watch } from "vue";
import AiConfigFields from "../ai/AiConfigFields.vue";
import { useAiConfig } from "../../composables/useAiConfig";
import type { AiConfigSyncPayload } from "../../types/aiConfig";

const props = withDefaults(
  defineProps<{
    idPrefix?: string;
    disabled?: boolean;
    showTitle?: boolean;
    showThinkingToggle?: boolean;
    compact?: boolean;
  }>(),
  {
    idPrefix: "ai-config",
    disabled: false,
    showTitle: false,
    showThinkingToggle: true,
    compact: false
  }
);

const emit = defineEmits<{
  sync: [payload: AiConfigSyncPayload];
}>();

const disabledRef = toRef(props, "disabled");

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
  refreshBalance,
  emitSync
} = useAiConfig({
  persistOnFieldChange: true,
  disabled: disabledRef,
  onSync: (payload) => emit("sync", payload)
});

watch([apiKeyConfigured, thinkingEnabled, isDeepSeek, balanceText], () => emitSync());

onMounted(() => {
  initFromStorage();
});

defineExpose({
  persist,
  refreshBalance,
  toggleThinking,
  apiKeyConfigured,
  thinkingEnabled,
  isDeepSeek,
  balanceText
});
</script>

<template>
  <div class="ai-config-form" :class="{ 'ai-config-form--compact': compact }">
    <h3 v-if="showTitle" class="ai-config-form__title h6 mb-3">AI 模型配置</h3>
    <AiConfigFields
      :id-prefix="idPrefix"
      :disabled="disabled"
      :show-thinking-toggle="showThinkingToggle"
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
      @credential-input="onCredentialInput"
      @field-persist="onFieldPersist"
      @fetch-models="fetchModels"
    />
  </div>
</template>

<style scoped>
.ai-config-form__title {
  font-weight: 600;
}
</style>
