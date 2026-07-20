import { computed, ref, type Ref } from "vue";
import {
  getOpenAIDefaults,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
  type ReasoningEffort
} from "../services/ai/aiConfigStorage";
import {
  fetchModelsList,
  fetchUserBalance,
  formatBalanceInfo,
  isDeepSeekBaseURL
} from "../services/ai/llmClient";
import type { AiConfigSyncPayload } from "../types/aiConfig";

export interface UseAiConfigOptions {
  /** When true, field changes persist immediately (AiConfigForm). Step1 keeps false. */
  persistOnFieldChange?: boolean;
  disabled?: Ref<boolean> | (() => boolean);
  onSync?: (payload: AiConfigSyncPayload) => void;
}

function resolveDisabled(disabled?: Ref<boolean> | (() => boolean)): boolean {
  if (!disabled) return false;
  return typeof disabled === "function" ? disabled() : disabled.value;
}

export function useAiConfig(options: UseAiConfigOptions = {}) {
  const persistOnFieldChange = options.persistOnFieldChange ?? false;

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
      Boolean(
        baseURL.value.trim() &&
          apiKey.value.trim() &&
          !resolveDisabled(options.disabled) &&
          !modelsLoading.value
      )
  );

  function emitSync() {
    options.onSync?.({
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

  function onCredentialInput() {
    clearModelsState();
  }

  function onFieldPersist() {
    if (persistOnFieldChange) persist();
  }

  function toggleThinking() {
    thinkingEnabled.value = !thinkingEnabled.value;
    persist();
  }

  function initFromStorage(): AiConfig {
    const config = loadAiConfig();
    baseURL.value = config.baseURL;
    apiKey.value = config.apiKey;
    model.value = config.model;
    thinkingEnabled.value = config.thinkingEnabled;
    reasoningEffort.value = config.reasoningEffort;
    emitSync();
    return config;
  }

  async function fetchModels() {
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

  return {
    baseURL,
    apiKey,
    model,
    thinkingEnabled,
    reasoningEffort,
    availableModels,
    modelsLoading,
    modelsError,
    balanceText,
    baseURLPlaceholder,
    modelPlaceholder,
    apiKeyConfigured,
    isDeepSeek,
    canFetchModels,
    persist,
    clearModelsState,
    onCredentialInput,
    onFieldPersist,
    toggleThinking,
    initFromStorage,
    fetchModels,
    refreshBalance,
    emitSync
  };
}

export type UseAiConfigReturn = ReturnType<typeof useAiConfig>;
