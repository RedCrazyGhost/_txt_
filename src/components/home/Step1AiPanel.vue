<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { appState, type TxtEntry } from "../../state/appState";
import {
  getOpenAIDefaults,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
  type ReasoningEffort
} from "../../services/ai/aiConfigStorage";
import { formatQuestionText, generateQuestionsFromAi } from "../../services/ai/generateQuestions";
import {
  fetchModelsList,
  fetchUserBalance,
  formatBalanceInfo,
  isDeepSeekBaseURL
} from "../../services/ai/llmClient";
import {
  REFERENCE_FILE_ACCEPT,
  addReferenceFiles,
  formatUserMessageWithReferences,
  type ReferenceFile
} from "../../services/ai/referenceFile";
import {
  formatReviewStatusMessage,
  reviewGeneratedAnswers,
  summarizeReviewVerdicts,
  type ReviewedQuestion,
  type Verdict
} from "../../services/ai/reviewGeneratedAnswers";
import { generateQuestionsJsonFromTxts } from "../../services/homeQuestionsJson";

const EXAMPLE_PROMPTS = [
  "生成 5 道高中数学一元二次方程填空题，难度中等",
  "出 10 道 C 语言基础单选题，含指针与数组",
  "混合 8 题：JavaScript 闭包与原型链，简单易懂"
] as const;

type WriteMode = "replace" | "append";
type MessageRole = "user" | "assistant";
type MessageVariant = "default" | "error" | "success";
type LoadingPhase = "generate" | "review" | "";

interface GenerationMeta {
  name?: string;
  type?: string;
  author?: string;
}

interface AiPanelMessage {
  role: MessageRole;
  content: string;
  variant?: MessageVariant;
  questions?: ReviewedQuestion[];
  meta?: GenerationMeta;
  selected: boolean[];
  showAnswers?: boolean;
  showExplanation?: boolean;
  writeMode?: WriteMode | null;
}

type AiPanelMessageExtra = Partial<Omit<AiPanelMessage, "role" | "content">>;

const userPrompt = ref("");
const messages = ref<AiPanelMessage[]>([]);
const defaultWriteMode = ref<WriteMode>("replace");
const baseURL = ref("");
const apiKey = ref("");
const model = ref("");
const thinkingEnabled = ref(true);
const reasoningEffort = ref<ReasoningEffort>("high");
const loading = ref(false);
const loadingPhase = ref<LoadingPhase>("");
const composerError = ref("");
const messagesEl = ref<HTMLElement | null>(null);
const promptEl = ref<HTMLTextAreaElement | null>(null);
const referenceInputEl = ref<HTMLInputElement | null>(null);
const referenceFiles = ref<ReferenceFile[]>([]);
const settingsOpen = ref(false);
const isFullscreen = ref(false);
const availableModels = ref<string[]>([]);
const modelsLoading = ref(false);
const modelsError = ref("");
const balanceText = ref("");

const apiKeyConfigured = computed(() => Boolean(apiKey.value.trim()));
const isDeepSeek = computed(() => isDeepSeekBaseURL(baseURL.value));
const canFetchModels = computed(
  () => Boolean(baseURL.value.trim() && apiKey.value.trim() && !loading.value && !modelsLoading.value)
);

const openaiDefaults = getOpenAIDefaults();

const baseURLPlaceholder = computed(() => openaiDefaults.baseURL);
const modelPlaceholder = computed(() => openaiDefaults.model);

const showExamples = computed(() => messages.value.length === 0 && !loading.value);

onMounted(() => {
  const config = loadAiConfig();
  baseURL.value = config.baseURL;
  apiKey.value = config.apiKey;
  model.value = config.model;
  thinkingEnabled.value = config.thinkingEnabled;
  reasoningEffort.value = config.reasoningEffort;
  settingsOpen.value = !config.apiKey?.trim();
});

watch(isFullscreen, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
  if (value) {
    document.addEventListener("keydown", handleDocumentKeydown);
  } else {
    document.removeEventListener("keydown", handleDocumentKeydown);
  }
});

onUnmounted(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleDocumentKeydown);
});

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isFullscreen.value) {
    isFullscreen.value = false;
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function createTxtEntry(item: ReviewedQuestion): TxtEntry {
  const explanation = typeof item?.explanation === "string" ? item.explanation.trim() : "";
  return {
    MD5: false,
    txt: item.txt,
    image: "",
    noDelete: false,
    ...(explanation ? { explanation } : {})
  };
}

function applyGeneratedTxts(generatedQuestions: ReviewedQuestion[], mode: WriteMode = "replace") {
  const entries = generatedQuestions.map((item) => createTxtEntry(item));
  if (mode === "append") {
    const hasOnlyEmptyPlaceholder =
      appState.txts.length === 1 && !appState.txts[0].txt.trim() && !appState.txts[0].image;
    if (hasOnlyEmptyPlaceholder) {
      appState.txts.splice(0, appState.txts.length, ...entries);
    } else {
      appState.txts.push(...entries);
    }
  } else {
    appState.txts.splice(0, appState.txts.length, ...entries);
  }
}

function applyGeneratedMeta(data: GenerationMeta) {
  if (data.name) appState.questionsJSON.name = data.name;
  if (data.type) appState.questionsJSON.type = data.type;
  if (data.author) appState.questionsJSON.author = data.author;
}

async function scrollMessagesToBottom() {
  await nextTick();
  const el = messagesEl.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

function persistAiConfig(): AiConfig {
  return saveAiConfig({
    baseURL: baseURL.value,
    apiKey: apiKey.value,
    model: model.value,
    thinkingEnabled: thinkingEnabled.value,
    reasoningEffort: reasoningEffort.value
  });
}

function toggleThinkingEnabled() {
  thinkingEnabled.value = !thinkingEnabled.value;
  persistAiConfig();
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
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
    persistAiConfig();
  } finally {
    modelsLoading.value = false;
  }
}

async function refreshDeepSeekBalance() {
  if (!isDeepSeek.value || !baseURL.value.trim() || !apiKey.value.trim()) {
    balanceText.value = "";
    return;
  }

  const result = await fetchUserBalance({
    baseURL: baseURL.value,
    apiKey: apiKey.value
  });

  if (result.ok) {
    balanceText.value = formatBalanceInfo(result.data);
  }
}

function pushMessage(
  role: MessageRole,
  content: string,
  variant: MessageVariant = "default",
  extra: AiPanelMessageExtra = {}
) {
  messages.value.push({ role, content, variant, ...extra, selected: extra.selected ?? [] });
  scrollMessagesToBottom();
}

function formatQuestionTextForMessage(msg: AiPanelMessage, txt: string) {
  return formatQuestionText(txt, Boolean(msg.showAnswers));
}

function verdictLabel(verdict: Verdict) {
  if (verdict === "pass") return "通过";
  if (verdict === "fail") return "不通过";
  return "存疑";
}

function getSelectedQuestions(msg: AiPanelMessage) {
  if (!msg.questions?.length) return [];
  return msg.questions.filter((_, index) => msg.selected[index] !== false);
}

function isAllQuestionsSelected(msg: AiPanelMessage) {
  return Boolean(msg.questions?.length && msg.questions.every((_, index) => msg.selected[index] !== false));
}

function toggleAllQuestions(msg: AiPanelMessage) {
  if (!msg.questions?.length) return;
  const nextValue = !isAllQuestionsSelected(msg);
  msg.selected = msg.questions.map(() => nextValue);
}

async function applyMessageToTxts(msg: AiPanelMessage, mode: WriteMode) {
  const selectedQuestions = getSelectedQuestions(msg);
  if (!selectedQuestions.length) {
    composerError.value = "请至少选择一道题目。";
    return;
  }
  composerError.value = "";
  applyGeneratedTxts(selectedQuestions, mode);
  if (msg.meta) applyGeneratedMeta(msg.meta);
  defaultWriteMode.value = mode;
  msg.writeMode = mode;

  try {
    await generateQuestionsJsonFromTxts();
  } catch {
    composerError.value = "生成 JSON 失败，请检查题目格式。";
  }
}

function focusComposer() {
  nextTick(() => {
    promptEl.value?.focus();
  });
}

function applyExample(text: string) {
  userPrompt.value = text;
  composerError.value = "";
  focusComposer();
}

function clearComposerError() {
  if (composerError.value) {
    composerError.value = "";
  }
}

function triggerReferencePicker() {
  if (loading.value) return;
  referenceInputEl.value?.click();
}

async function handleReferenceChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const result = await addReferenceFiles(referenceFiles.value, input.files);
  input.value = "";

  if (!result.ok) {
    composerError.value = result.error || "添加参考文件失败。";
    return;
  }

  referenceFiles.value = result.files;
  clearComposerError();
}

function removeReferenceFile(name: string) {
  referenceFiles.value = referenceFiles.value.filter((file) => file.name !== name);
}

function clearReferenceFiles() {
  referenceFiles.value = [];
  if (referenceInputEl.value) {
    referenceInputEl.value.value = "";
  }
}

async function handleGenerate() {
  if (loading.value) return;

  const trimmedPrompt = userPrompt.value.trim();
  if (!trimmedPrompt) {
    composerError.value = "请输入生成要求。";
    focusComposer();
    return;
  }
  if (!apiKey.value.trim()) {
    composerError.value = "请先在模型设置中填写 API Key。";
    settingsOpen.value = true;
    return;
  }

  composerError.value = "";
  const refs = [...referenceFiles.value];
  pushMessage("user", formatUserMessageWithReferences(trimmedPrompt, refs));
  userPrompt.value = "";
  clearReferenceFiles();
  loading.value = true;
  loadingPhase.value = "generate";

  const config = persistAiConfig();

  try {
    const result = await generateQuestionsFromAi({
      prompt: trimmedPrompt,
      references: refs,
      config
    });

    if (!result.ok) {
      pushMessage("assistant", result.message || "生成失败，请重试。", "error");
      return;
    }

    loadingPhase.value = "review";
    const reviewResult = await reviewGeneratedAnswers({
      questions: result.data.questions,
      config
    });

    const reviewedQuestions = reviewResult.questions;
    const summary = summarizeReviewVerdicts(reviewedQuestions);
    const statusMessage = formatReviewStatusMessage(summary, {
      generationMessage: result.message,
      reviewFailed: Boolean(reviewResult.reviewFailed),
      reviewFailMessage: reviewResult.reviewFailed ? reviewResult.message : ""
    });

    const messagePayload: AiPanelMessageExtra = {
      questions: reviewedQuestions,
      meta: {
        name: result.data.name,
        type: result.data.type,
        author: result.data.author
      },
      selected: reviewedQuestions.map((question) => question.verdict === "pass"),
      showAnswers: false,
      showExplanation: false,
      writeMode: null
    };

    pushMessage("assistant", statusMessage, "success", messagePayload);
  } finally {
    loading.value = false;
    loadingPhase.value = "";
    await refreshDeepSeekBalance();
    focusComposer();
  }
}

function handlePromptKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleGenerate();
  }
}

function autoResizePrompt() {
  const el = promptEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}
</script>

<template>
  <div class="step1-ai-panel">
    <div class="step1-ai-dialog" :class="{ 'is-fullscreen': isFullscreen }">
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
          @click="toggleFullscreen"
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
        :class="{ 'has-overlay-fs': !showExamples }"
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
          @click="toggleFullscreen"
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
              v-for="example in EXAMPLE_PROMPTS"
              :key="example"
              type="button"
              class="step1-ai-example-chip"
              @click="applyExample(example)"
            >
              <i class="fas fa-wand-magic-sparkles step1-ai-example-chip-icon" aria-hidden="true"></i>
              <span>{{ example }}</span>
            </button>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="`msg-${index}`"
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
                @change="toggleAllQuestions(msg)"
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
              @click="applyMessageToTxts(msg, 'replace')"
            >
              替换 JSON
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary step1-ai-action-btn"
              :class="{ 'is-active': msg.writeMode === 'append' }"
              :disabled="loading"
              @click="applyMessageToTxts(msg, 'append')"
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

        <div v-if="loading" class="step1-ai-dialog-bubble is-assistant is-loading">
          <span class="step1-ai-dialog-role">AI</span>
          <p class="step1-ai-dialog-text mb-0">
            <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ loadingPhase === "review" ? "正在复核答案…" : "正在生成题目…" }}
          </p>
        </div>
      </div>

      <div class="step1-ai-composer-wrap">
        <div
          class="step1-ai-composer-box"
          :class="{ 'is-settings-open': settingsOpen, 'needs-key': !apiKeyConfigured }"
        >
          <div v-if="referenceFiles.length" class="step1-ai-reference-list">
            <div
              v-for="file in referenceFiles"
              :key="file.name"
              class="step1-ai-reference-chip"
            >
              <i class="fas fa-file-lines step1-ai-reference-chip-icon" aria-hidden="true"></i>
              <span class="step1-ai-reference-chip-name" :title="file.name">{{ file.name }}</span>
              <button
                type="button"
                class="step1-ai-reference-chip-remove"
                :aria-label="`移除参考文件 ${file.name}`"
                :disabled="loading"
                @click="removeReferenceFile(file.name)"
              >
                <i class="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <textarea
            id="step1-ai-prompt"
            ref="promptEl"
            v-model="userPrompt"
            class="step1-ai-composer-input"
            rows="2"
            placeholder="描述题集要求…"
            :disabled="loading"
            aria-label="AI 生成要求"
            @input="autoResizePrompt(); clearComposerError()"
            @keydown="handlePromptKeydown"
          />
          <div class="step1-ai-composer-footer">
            <div class="step1-ai-composer-tools">
              <button
                type="button"
                class="step1-ai-composer-chip step1-ai-settings-btn"
                :class="{ 'is-active': settingsOpen }"
                :aria-expanded="settingsOpen"
                aria-label="模型设置"
                :disabled="loading"
                @click="toggleSettings"
              >
                <i class="fas fa-brain" aria-hidden="true"></i>
                <span>模型</span>
                <span v-if="!apiKeyConfigured" class="step1-ai-settings-badge" aria-label="未配置 API Key"></span>
              </button>
              <button
                type="button"
                class="step1-ai-composer-chip"
                :class="{ 'is-active': thinkingEnabled }"
                :aria-pressed="thinkingEnabled"
                :disabled="loading"
                @click="toggleThinkingEnabled"
              >
                <i class="fas fa-atom" aria-hidden="true"></i>
                <span>深度思考</span>
              </button>
              <button
                type="button"
                class="step1-ai-composer-chip"
                :class="{ 'is-active': referenceFiles.length > 0 }"
                aria-label="添加参考文件"
                :disabled="loading"
                @click="triggerReferencePicker"
              >
                <i class="fas fa-paperclip" aria-hidden="true"></i>
                <span>参考文件</span>
              </button>
              <input
                ref="referenceInputEl"
                type="file"
                class="d-none"
                multiple
                :accept="REFERENCE_FILE_ACCEPT"
                :disabled="loading"
                @change="handleReferenceChange"
              />
            </div>
            <button
              type="button"
              class="step1-ai-composer-send"
              :disabled="loading || !userPrompt.trim()"
              aria-label="发送"
              @click="handleGenerate"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <i v-else class="fas fa-arrow-up" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div v-show="settingsOpen" class="step1-ai-settings">
          <div class="row g-2">
          <div class="col-12">
            <label class="form-label form-label-sm" for="step1-ai-base-url">Base URL</label>
            <input
              id="step1-ai-base-url"
              v-model="baseURL"
              class="form-control form-control-sm"
              :placeholder="baseURLPlaceholder"
              :disabled="loading || modelsLoading"
              @input="availableModels = []; modelsError = ''; balanceText = ''"
            />
          </div>
          <div class="col-12">
            <label class="form-label form-label-sm" for="step1-ai-api-key">
              API Key <span class="text-danger">*</span>
            </label>
            <input
              id="step1-ai-api-key"
              v-model="apiKey"
              type="password"
              class="form-control form-control-sm"
              placeholder="sk-..."
              autocomplete="off"
              :disabled="loading || modelsLoading"
              @input="clearComposerError(); availableModels = []; modelsError = ''; balanceText = ''"
            />
          </div>
          <div class="col-12">
            <label class="form-label form-label-sm" for="step1-ai-model">模型</label>
            <div class="step1-ai-model-row">
              <select
                v-if="availableModels.length"
                id="step1-ai-model"
                v-model="model"
                class="form-select form-select-sm"
                :disabled="loading || modelsLoading"
                @change="persistAiConfig"
              >
                <option v-for="item in availableModels" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
              <input
                v-else
                id="step1-ai-model"
                v-model="model"
                class="form-control form-control-sm"
                :placeholder="modelPlaceholder"
                :disabled="loading || modelsLoading"
              />
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary step1-ai-fetch-models-btn"
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
            <p v-if="modelsError" class="step1-ai-settings-field-error small text-danger mb-0 mt-1" role="alert">
              {{ modelsError }}
            </p>
          </div>
          <div v-if="thinkingEnabled" class="col-md-6">
            <label class="form-label form-label-sm" for="step1-ai-reasoning-effort">推理强度</label>
            <select
              id="step1-ai-reasoning-effort"
              v-model="reasoningEffort"
              class="form-select form-select-sm"
              :disabled="loading"
              @change="persistAiConfig"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
        <p class="step1-ai-settings-hint small text-muted mb-0 mt-2">
          使用 OpenAI SDK（<code>/chat/completions</code>）。填写 Base URL 与 Key 后可获取模型列表；Key 仅存本地。
        </p>
        <p v-if="isDeepSeek && balanceText" class="step1-ai-balance small text-muted mb-0 mt-1">
          <i class="fas fa-wallet step1-ai-balance-icon" aria-hidden="true"></i>
          DeepSeek 余额：{{ balanceText }}
        </p>
      </div>

        <p v-if="isDeepSeek && balanceText && !settingsOpen" class="step1-ai-balance step1-ai-balance-outside small text-muted mb-0">
          <i class="fas fa-wallet step1-ai-balance-icon" aria-hidden="true"></i>
          DeepSeek 余额：{{ balanceText }}
        </p>

        <p v-if="composerError" class="step1-ai-composer-error small text-danger mb-0" role="alert">
          {{ composerError }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step1-ai-panel {
  display: flex;
  flex-direction: column;
}

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

.step1-ai-settings-btn {
  position: relative;
}

.step1-ai-settings-btn.needs-key {
  border-color: var(--bs-warning);
}

.step1-ai-settings-badge {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background-color: var(--bs-warning);
}

.step1-ai-settings {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.625rem;
  background-color: var(--bs-body-bg);
}

.form-label-sm {
  margin-bottom: 0.2rem;
  font-size: 0.8125rem;
}

.step1-ai-settings-hint code {
  font-size: 0.75rem;
}

.step1-ai-model-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.step1-ai-model-row .form-control,
.step1-ai-model-row .form-select {
  flex: 1;
  min-width: 0;
}

.step1-ai-fetch-models-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.step1-ai-settings-field-error {
  line-height: 1.35;
}

.step1-ai-balance {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  line-height: 1.4;
}

.step1-ai-balance-icon {
  margin-top: 0.15rem;
  opacity: 0.7;
}

.step1-ai-balance-outside {
  margin-top: 0.35rem;
  padding-left: 0.15rem;
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

.step1-ai-dialog.is-fullscreen .step1-ai-dialog-messages {
  flex: 1;
  min-height: 0;
  max-height: none;
}

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

.step1-ai-composer-wrap {
  padding: 0.625rem 0.75rem 0.5rem;
  background-color: var(--bs-tertiary-bg);
}

.step1-ai-composer-box {
  border: 1px solid var(--bs-border-color);
  border-radius: 1rem;
  background-color: var(--bs-body-bg);
  padding: 0.65rem 0.75rem 0.55rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.step1-ai-composer-box:focus-within {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-primary-rgb), 0.12);
}

.step1-ai-composer-box.is-settings-open {
  border-color: rgba(var(--bs-primary-rgb), 0.45);
}

.step1-ai-composer-box.needs-key:not(.is-settings-open) {
  border-color: rgba(var(--bs-warning-rgb), 0.55);
}

.step1-ai-reference-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
}

.step1-ai-reference-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background-color: var(--bs-secondary-bg);
  color: var(--bs-body-color);
  font-size: 0.75rem;
  line-height: 1.2;
}

.step1-ai-reference-chip-icon {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
}

.step1-ai-reference-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 12rem;
}

.step1-ai-reference-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--bs-secondary-color);
  font-size: 0.65rem;
  line-height: 1;
  cursor: pointer;
}

.step1-ai-reference-chip-remove:hover:not(:disabled) {
  color: var(--bs-danger);
}

.step1-ai-reference-chip-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.step1-ai-composer-input {
  width: 100%;
  min-height: 2.75rem;
  max-height: 10rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.875rem;
  line-height: 1.45;
  resize: none;
  overflow-y: auto;
}

.step1-ai-composer-input:focus {
  outline: none;
}

.step1-ai-composer-input:disabled {
  opacity: 0.7;
}

.step1-ai-composer-input::placeholder {
  color: var(--bs-secondary-color);
}

.step1-ai-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.45rem;
}

.step1-ai-composer-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.step1-ai-composer-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.35);
  border-radius: 999px;
  background: transparent;
  color: var(--bs-primary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.step1-ai-composer-chip:hover:not(:disabled) {
  background-color: rgba(var(--bs-primary-rgb), 0.06);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
}

.step1-ai-composer-chip.is-active {
  background-color: rgba(var(--bs-primary-rgb), 0.12);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
}

.step1-ai-composer-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.step1-ai-composer-send {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: var(--bs-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.step1-ai-composer-send:hover:not(:disabled) {
  opacity: 0.92;
}

.step1-ai-composer-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step1-ai-composer-error {
  margin-top: 0.35rem;
  padding: 0 0.15rem;
}

[data-bs-theme="dark"] .step1-ai-dialog-bubble.is-success {
  background-color: rgba(var(--bs-success-rgb), 0.12);
}

[data-bs-theme="dark"] .step1-ai-dialog-bubble.is-error {
  background-color: rgba(var(--bs-danger-rgb), 0.12);
}
</style>
