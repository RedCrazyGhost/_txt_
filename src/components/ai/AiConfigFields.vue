<script setup lang="ts">
import type { ReasoningEffort } from "../../services/ai/aiConfigStorage";

const props = withDefaults(
  defineProps<{
    idPrefix?: string;
    disabled?: boolean;
    showThinkingToggle?: boolean;
    showBalance?: boolean;
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
  {
    idPrefix: "ai-config",
    disabled: false,
    showThinkingToggle: true,
    showBalance: true
  }
);

const emit = defineEmits<{
  "update:baseUrl": [value: string];
  "update:apiKey": [value: string];
  "update:model": [value: string];
  "update:thinkingEnabled": [value: boolean];
  "update:reasoningEffort": [value: ReasoningEffort];
  credentialInput: [];
  fieldPersist: [];
  fetchModels: [];
}>();

function updateBaseUrl(event: Event) {
  emit("update:baseUrl", (event.target as HTMLInputElement).value);
  emit("credentialInput");
}

function updateApiKey(event: Event) {
  emit("update:apiKey", (event.target as HTMLInputElement).value);
  emit("credentialInput");
}
</script>

<template>
  <div class="row g-2">
    <div class="col-12">
      <label class="form-label form-label-sm" :for="`${idPrefix}-base-url`">OpenAI Base URL</label>
      <input
        :id="`${idPrefix}-base-url`"
        :value="baseUrl"
        class="form-control form-control-sm"
        :placeholder="baseUrlPlaceholder"
        :disabled="disabled || modelsLoading"
        @input="updateBaseUrl"
        @change="emit('fieldPersist')"
      />
    </div>
    <div class="col-12">
      <label class="form-label form-label-sm" :for="`${idPrefix}-api-key`">
        API Key <span class="text-danger">*</span>
      </label>
      <input
        :id="`${idPrefix}-api-key`"
        :value="apiKey"
        type="password"
        class="form-control form-control-sm"
        placeholder="sk-..."
        autocomplete="off"
        :disabled="disabled || modelsLoading"
        @input="updateApiKey"
        @change="emit('fieldPersist')"
      />
    </div>
    <div class="col-12">
      <label class="form-label form-label-sm" :for="`${idPrefix}-model`">模型</label>
      <div class="ai-config-fields__model-row">
        <select
          v-if="availableModels.length"
          :id="`${idPrefix}-model`"
          :value="model"
          class="form-select form-select-sm"
          :disabled="disabled || modelsLoading"
          @change="
            emit('update:model', ($event.target as HTMLSelectElement).value);
            emit('fieldPersist');
          "
        >
          <option v-for="item in availableModels" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
        <input
          v-else
          :id="`${idPrefix}-model`"
          :value="model"
          class="form-control form-control-sm"
          :placeholder="modelPlaceholder"
          :disabled="disabled || modelsLoading"
          @input="emit('update:model', ($event.target as HTMLInputElement).value)"
          @change="emit('fieldPersist')"
        />
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary ai-config-fields__fetch-btn"
          :disabled="!canFetchModels"
          @click="emit('fetchModels')"
        >
          <span
            v-if="modelsLoading"
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <span v-else>获取模型</span>
        </button>
      </div>
      <p v-if="modelsError" class="small text-danger mb-0 mt-1" role="alert">
        {{ modelsError }}
      </p>
    </div>
    <div v-if="showThinkingToggle" class="col-12 col-md-6">
      <label class="form-label form-label-sm" :for="`${idPrefix}-thinking`">深度思考</label>
      <div class="form-check form-switch mt-1">
        <input
          :id="`${idPrefix}-thinking`"
          :checked="thinkingEnabled"
          class="form-check-input"
          type="checkbox"
          role="switch"
          :disabled="disabled"
          @change="
            emit('update:thinkingEnabled', ($event.target as HTMLInputElement).checked);
            emit('fieldPersist');
          "
        />
        <label class="form-check-label small" :for="`${idPrefix}-thinking`">
          {{ thinkingEnabled ? "已开启" : "已关闭" }}
        </label>
      </div>
    </div>
    <div v-if="thinkingEnabled" class="col-12 col-md-6">
      <label class="form-label form-label-sm" :for="`${idPrefix}-reasoning-effort`">推理强度</label>
      <select
        :id="`${idPrefix}-reasoning-effort`"
        :value="reasoningEffort"
        class="form-select form-select-sm"
        :disabled="disabled"
        @change="
          emit('update:reasoningEffort', ($event.target as HTMLSelectElement).value as ReasoningEffort);
          emit('fieldPersist');
        "
      >
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
    </div>
  </div>
  <p v-if="showBalance && isDeepSeek && balanceText" class="ai-config-fields__balance small text-muted mb-0 mt-1">
    <i class="fas fa-wallet me-1" aria-hidden="true"></i>
    DeepSeek 余额：{{ balanceText }}
  </p>
</template>

<style scoped>
.form-label-sm {
  margin-bottom: 0.2rem;
  font-size: 0.8125rem;
}

.ai-config-fields__model-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.ai-config-fields__model-row .form-control,
.ai-config-fields__model-row .form-select {
  flex: 1 1 auto;
  min-width: 0;
}

.ai-config-fields__fetch-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.ai-config-fields__balance {
  display: flex;
  align-items: center;
}
</style>
