<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  getOpenAIDefaults,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
  type ReasoningEffort
} from "../../services/ai/aiConfigStorage";
import {
  fetchModelsList,
  fetchUserBalance,
  formatBalanceInfo,
  isDeepSeekBaseURL
} from "../../services/ai/llmClient";

interface AiConfigSyncPayload {
  apiKeyConfigured: boolean;
  thinkingEnabled: boolean;
  isDeepSeek: boolean;
  balanceText: string;
}

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

const baseURL = ref("");
const apiKey = ref("");
const model = ref("");
const thinkingEnabled = ref(true);
const reasoningEffort = ref<ReasoningEffort>("high");
const availableModels = ref<string[]>([]);
const modelsLoading = ref(false);
const modelsError = ref("");
const balanceText = ref("");

const openaiDefaults = getOpenAIDefaults();
const baseURLPlaceholder = computed(() => openaiDefaults.baseURL);
const modelPlaceholder = computed(() => openaiDefaults.model);
const apiKeyConfigured = computed(() => Boolean(apiKey.value.trim()));
const isDeepSeek = computed(() => isDeepSeekBaseURL(baseURL.value));
const canFetchModels = computed(
  () =>
    Boolean(baseURL.value.trim() && apiKey.value.trim() && !props.disabled && !modelsLoading.value)
);

function emitSync() {
  emit("sync", {
    apiKeyConfigured: apiKeyConfigured.value,
    thinkingEnabled: thinkingEnabled.value,
    isDeepSeek: isDeepSeek.value,
    balanceText: balanceText.value
  });
}

function persist(): AiConfig {
  const saved = saveAiConfig({
    baseURL: baseURL.value,
    apiKey: apiKey.value,
    model: model.value,
    thinkingEnabled: thinkingEnabled.value,
    reasoningEffort: reasoningEffort.value
  });
  emitSync();
  return saved;
}

function clearModelsState() {
  availableModels.value = [];
  modelsError.value = "";
  balanceText.value = "";
  emitSync();
}

function toggleThinking() {
  thinkingEnabled.value = !thinkingEnabled.value;
  persist();
}

async function handleFetchModels() {
  if (modelsLoading.value) return;

  if (!baseURL.value.trim() || !apiKey.value.trim()) {
    modelsError.value = "请先填写 Base URL 和 API Key。";
    return;
  }

  modelsLoading.value = true;
  modelsError.value = "";

  try {
    const result = await fetchModelsList({
      baseURL: baseURL.value,
      apiKey: apiKey.value
    });

    if (!result.ok) {
      availableModels.value = [];
      modelsError.value = result.message || "获取模型列表失败。";
      return;
    }

    availableModels.value = result.models;
    if (result.models.length && !result.models.includes(model.value)) {
      model.value = result.models[0];
    }
    persist();
  } finally {
    modelsLoading.value = false;
  }
}

async function refreshBalance() {
  if (!isDeepSeek.value || !baseURL.value.trim() || !apiKey.value.trim()) {
    balanceText.value = "";
    emitSync();
    return;
  }

  const result = await fetchUserBalance({
    baseURL: baseURL.value,
    apiKey: apiKey.value
  });

  if (result.ok) {
    balanceText.value = formatBalanceInfo(result.data);
  }
  emitSync();
}

watch([apiKeyConfigured, thinkingEnabled, isDeepSeek, balanceText], emitSync);

onMounted(() => {
  const config = loadAiConfig();
  baseURL.value = config.baseURL;
  apiKey.value = config.apiKey;
  model.value = config.model;
  thinkingEnabled.value = config.thinkingEnabled;
  reasoningEffort.value = config.reasoningEffort;
  emitSync();
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
    <div class="row g-2">
      <div class="col-12">
        <label class="form-label form-label-sm" :for="`${idPrefix}-base-url`">Base URL</label>
        <input
          :id="`${idPrefix}-base-url`"
          v-model="baseURL"
          class="form-control form-control-sm"
          :placeholder="baseURLPlaceholder"
          :disabled="disabled || modelsLoading"
          @input="clearModelsState"
          @change="persist"
        />
      </div>
      <div class="col-12">
        <label class="form-label form-label-sm" :for="`${idPrefix}-api-key`">
          API Key <span class="text-danger">*</span>
        </label>
        <input
          :id="`${idPrefix}-api-key`"
          v-model="apiKey"
          type="password"
          class="form-control form-control-sm"
          placeholder="sk-..."
          autocomplete="off"
          :disabled="disabled || modelsLoading"
          @input="clearModelsState"
          @change="persist"
        />
      </div>
      <div class="col-12">
        <label class="form-label form-label-sm" :for="`${idPrefix}-model`">模型</label>
        <div class="ai-config-form__model-row">
          <select
            v-if="availableModels.length"
            :id="`${idPrefix}-model`"
            v-model="model"
            class="form-select form-select-sm"
            :disabled="disabled || modelsLoading"
            @change="persist"
          >
            <option v-for="item in availableModels" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
          <input
            v-else
            :id="`${idPrefix}-model`"
            v-model="model"
            class="form-control form-control-sm"
            :placeholder="modelPlaceholder"
            :disabled="disabled || modelsLoading"
            @change="persist"
          />
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary ai-config-form__fetch-btn"
            :disabled="!canFetchModels"
            @click="handleFetchModels"
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
            v-model="thinkingEnabled"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :disabled="disabled"
            @change="persist"
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
          v-model="reasoningEffort"
          class="form-select form-select-sm"
          :disabled="disabled"
          @change="persist"
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </div>
    </div>
    <p class="ai-config-form__hint small text-muted mb-0 mt-2">
      使用 OpenAI SDK（<code>/chat/completions</code>）。填写 Base URL 与 Key 后可获取模型列表；Key 仅存本地。
      <router-link v-if="compact" class="ms-1" to="/settings">前往设置</router-link>
    </p>
    <p v-if="isDeepSeek && balanceText" class="ai-config-form__balance small text-muted mb-0 mt-1">
      <i class="fas fa-wallet me-1" aria-hidden="true"></i>
      DeepSeek 余额：{{ balanceText }}
    </p>
  </div>
</template>

<style scoped>
.form-label-sm {
  margin-bottom: 0.2rem;
  font-size: 0.8125rem;
}

.ai-config-form__title {
  font-weight: 600;
}

.ai-config-form__hint code {
  font-size: 0.75rem;
}

.ai-config-form__model-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.ai-config-form__model-row .form-control,
.ai-config-form__model-row .form-select {
  flex: 1 1 auto;
  min-width: 0;
}

.ai-config-form__fetch-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.ai-config-form__balance {
  display: flex;
  align-items: center;
}
</style>
