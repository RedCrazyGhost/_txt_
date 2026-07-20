<script setup lang="ts">
import { onMounted, ref } from "vue";
import { appState, type TxtEntry } from "../../state/appState";
import { loadAiConfig, saveAiConfig } from "../../services/ai/aiConfigStorage";
import {
  generateQuestionsFromAi,
  type GeneratedQuestion,
  type GenerationPayload
} from "../../services/ai/generateQuestions";
import "./homeShared.css";

type TxtWriteMode = "replace" | "append";
type QuestionTypeOption = "fillBlank" | "singleChoice" | "mixed";
type MessageTone = "secondary" | "warning" | "info" | "danger" | "success";

const topic = ref("");
const subject = ref("");
const count = ref(5);
const questionType = ref<QuestionTypeOption>("mixed");
const difficulty = ref("");
const txtMode = ref<TxtWriteMode>("replace");
const baseURL = ref("");
const apiKey = ref("");
const model = ref("");
const loading = ref(false);
const message = ref("");
const messageTone = ref<MessageTone>("secondary");

onMounted(() => {
  const config = loadAiConfig();
  baseURL.value = config.baseURL;
  apiKey.value = config.apiKey;
  model.value = config.model;
});

function setMessage(text: string, tone: MessageTone = "secondary") {
  message.value = text;
  messageTone.value = tone;
}

function createTxtEntry(txt: string): TxtEntry {
  return { MD5: false, txt, image: "", noDelete: false };
}

function applyGeneratedTxts(generatedQuestions: GeneratedQuestion[]) {
  const entries = generatedQuestions.map((item) => createTxtEntry(item.txt));
  if (txtMode.value === "append") {
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

function applyGeneratedMeta(data: Pick<GenerationPayload, "name" | "type" | "author">) {
  if (data.name) appState.questionsJSON.name = data.name;
  if (data.type) appState.questionsJSON.type = data.type;
  if (data.author) appState.questionsJSON.author = data.author;
}

function buildGeneratePrompt(trimmedTopic: string): string {
  const parts = [trimmedTopic];
  const trimmedSubject = subject.value.trim();
  if (trimmedSubject) parts.push(`学科/分类：${trimmedSubject}`);
  parts.push(`题目数量：${count.value}`);
  if (questionType.value === "fillBlank") {
    parts.push("题型：填空题");
  } else if (questionType.value === "singleChoice") {
    parts.push("题型：单选题");
  }
  const trimmedDifficulty = difficulty.value.trim();
  if (trimmedDifficulty) parts.push(`难度：${trimmedDifficulty}`);
  return parts.join("；");
}

async function handleGenerate() {
  if (loading.value) return;

  const trimmedTopic = topic.value.trim();
  if (!trimmedTopic) {
    setMessage("请填写主题。", "warning");
    return;
  }
  if (!apiKey.value.trim()) {
    setMessage("请填写 API Key。", "warning");
    return;
  }

  loading.value = true;
  setMessage("正在生成题目，请稍候…", "info");

  const config = saveAiConfig({
    baseURL: baseURL.value,
    apiKey: apiKey.value,
    model: model.value
  });

  try {
    const result = await generateQuestionsFromAi({
      prompt: buildGeneratePrompt(trimmedTopic),
      config
    });

    if (!result.ok) {
      setMessage(result.message || "生成失败，请重试。", "danger");
      return;
    }

    applyGeneratedTxts(result.data.questions);
    applyGeneratedMeta(result.data);
    setMessage(`${result.message} 已写入 Step 1，请点击「生成 JSON」继续。`, "success");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="modal fade" id="aiGenerateModal" tabindex="-1" aria-labelledby="aiGenerateModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-md modal-dialog-scrollable home-modal-compact">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title fs-6" id="aiGenerateModalLabel">
            <i class="fas fa-robot me-1"></i> AI 生成题目
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p class="small text-muted mb-2">
            浏览器直连 OpenAI 兼容 API；若服务端未配置 CORS，请求会被拦截，需使用支持跨域的端点或代理。
          </p>

          <div class="mb-2">
            <label class="form-label" for="ai-topic">主题 <span class="text-danger">*</span></label>
            <input
              id="ai-topic"
              v-model="topic"
              class="form-control form-control-sm"
              placeholder="例如：高中数学一元二次方程"
              :disabled="loading"
            />
          </div>

          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label" for="ai-subject">学科/分类</label>
              <input
                id="ai-subject"
                v-model="subject"
                class="form-control form-control-sm"
                placeholder="例如：数学"
                :disabled="loading"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ai-count">题目数量</label>
              <input
                id="ai-count"
                v-model.number="count"
                type="number"
                min="1"
                max="20"
                class="form-control form-control-sm"
                :disabled="loading"
              />
            </div>
          </div>

          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label" for="ai-question-type">题型</label>
              <select
                id="ai-question-type"
                v-model="questionType"
                class="form-select form-select-sm"
                :disabled="loading"
              >
                <option value="fillBlank">填空题</option>
                <option value="singleChoice">单选题</option>
                <option value="mixed">混合</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ai-difficulty">难度</label>
              <select
                id="ai-difficulty"
                v-model="difficulty"
                class="form-select form-select-sm"
                :disabled="loading"
              >
                <option value="">不限</option>
                <option value="简单">简单</option>
                <option value="中等">中等</option>
                <option value="困难">困难</option>
              </select>
            </div>
          </div>

          <div class="mb-2">
            <span class="form-label d-block">写入方式</span>
            <div class="d-flex flex-wrap gap-2">
              <div class="form-check form-check-inline mb-0">
                <input
                  id="ai-mode-replace"
                  v-model="txtMode"
                  class="form-check-input"
                  type="radio"
                  value="replace"
                  :disabled="loading"
                />
                <label class="form-check-label small" for="ai-mode-replace">替换现有题目</label>
              </div>
              <div class="form-check form-check-inline mb-0">
                <input
                  id="ai-mode-append"
                  v-model="txtMode"
                  class="form-check-input"
                  type="radio"
                  value="append"
                  :disabled="loading"
                />
                <label class="form-check-label small" for="ai-mode-append">追加到末尾</label>
              </div>
            </div>
          </div>

          <details class="home-details">
            <summary>API 设置</summary>
            <div class="mb-2">
              <label class="form-label" for="ai-base-url">Base URL</label>
              <input
                id="ai-base-url"
                v-model="baseURL"
                class="form-control form-control-sm"
                placeholder="https://api.openai.com/v1"
                :disabled="loading"
              />
            </div>
            <div class="mb-2">
              <label class="form-label" for="ai-api-key">API Key <span class="text-danger">*</span></label>
              <input
                id="ai-api-key"
                v-model="apiKey"
                type="password"
                class="form-control form-control-sm"
                placeholder="sk-..."
                autocomplete="off"
                :disabled="loading"
              />
            </div>
            <div>
              <label class="form-label" for="ai-model">模型</label>
              <input
                id="ai-model"
                v-model="model"
                class="form-control form-control-sm"
                placeholder="gpt-4o-mini"
                :disabled="loading"
              />
            </div>
          </details>

          <div v-if="message" class="alert mb-0 py-2 small" :class="`alert-${messageTone}`">
            {{ message }}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal" :disabled="loading">
            取消
          </button>
          <button type="button" class="btn btn-sm btn-primary" :disabled="loading" @click="handleGenerate">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ loading ? "生成中…" : "开始生成" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
