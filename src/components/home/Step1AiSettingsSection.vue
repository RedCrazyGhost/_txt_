<script setup lang="ts">
import AiConfigFields from "../ai/AiConfigFields.vue";
import type { ReasoningEffort } from "../../services/ai/aiConfigStorage";

withDefaults(
  defineProps<{
    disabled?: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    thinkingEnabled: boolean;
    reasoningEffort: ReasoningEffort;
    availableModels: string[];
    modelsLoading: boolean;
    modelsError: string;
    balanceText: string;
    baseUrlPlaceholder: string;
    modelPlaceholder: string;
    isDeepSeek: boolean;
    canFetchModels: boolean;
  }>(),
  { disabled: false }
);

defineEmits<{
  "update:baseUrl": [value: string];
  "update:apiKey": [value: string];
  "update:model": [value: string];
  "update:thinkingEnabled": [value: boolean];
  "update:reasoningEffort": [value: ReasoningEffort];
  credentialInput: [];
  fieldPersist: [];
  fetchModels: [];
}>();
</script>

<template>
  <div class="step1-ai-settings">
    <AiConfigFields
      id-prefix="step1-ai"
      :disabled="disabled"
      :show-thinking-toggle="false"
      :base-url="baseUrl"
      :api-key="apiKey"
      :model="model"
      :thinking-enabled="thinkingEnabled"
      :reasoning-effort="reasoningEffort"
      :available-models="availableModels"
      :models-loading="modelsLoading"
      :models-error="modelsError"
      :balance-text="balanceText"
      :base-url-placeholder="baseUrlPlaceholder"
      :model-placeholder="modelPlaceholder"
      :is-deep-seek="isDeepSeek"
      :can-fetch-models="canFetchModels"
      @update:base-url="$emit('update:baseUrl', $event)"
      @update:api-key="$emit('update:apiKey', $event)"
      @update:model="$emit('update:model', $event)"
      @update:thinking-enabled="$emit('update:thinkingEnabled', $event)"
      @update:reasoning-effort="$emit('update:reasoningEffort', $event)"
      @credential-input="$emit('credentialInput')"
      @field-persist="$emit('fieldPersist')"
      @fetch-models="$emit('fetchModels')"
    />
  </div>
</template>

<style scoped>
.step1-ai-settings {
  margin-top: 0.65rem;
  padding: 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--bs-tertiary-bg) 88%, transparent);
}
</style>
