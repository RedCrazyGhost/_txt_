<script setup>
import { computed, ref } from "vue";
import { appState } from "../state/appState";
import AppQuestion from "../components/AppQuestion.vue";
import { questionProgressState } from "../state/questionProgressState";
import {
  applyRedoAllQuestions,
  applyRetryWrongQuestions,
  saveProgressToBrowser,
  saveQuestionBankToLocal
} from "../services/practicePageActions";

const statusMessage = ref("");
const statusTone = ref("success");
let statusTimer = null;

const hasQuestions = computed(
  () => Array.isArray(appState.questionsJSON.questions) && appState.questionsJSON.questions.length > 0
);

const canSaveProgress = computed(
  () => hasQuestions.value && Boolean(appState.questionsJSON.bankId)
);

const canSaveToLocalBank = computed(() => hasQuestions.value);

const canRedoAll = computed(() => questionProgressState.attemptedSlots > 0);

const canRetryWrong = computed(() => questionProgressState.wrongQuestionCount > 0);

function showStatus(message, tone = "success") {
  statusMessage.value = message;
  statusTone.value = tone;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMessage.value = "";
    statusTimer = null;
  }, 5000);
}

function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function handleSaveProgress() {
  const result = saveProgressToBrowser(appState.questionsJSON);
  showStatus(result.message, result.ok ? "success" : "warning");
}

function handleSaveToLocalBank() {
  saveQuestionBankToLocal(appState.questionsJSON).then((result) => {
    showStatus(result.message, result.ok ? "success" : "warning");
  });
}

function handleRedoAll() {
  if (!canRedoAll.value) return;
  const name = appState.questionsJSON.name || "未命名题集";
  const ok = window.confirm(`确定清空《${name}》的全部答题记录并从头重做？`);
  if (!ok) return;
  const result = applyRedoAllQuestions(appState.questionsJSON);
  showStatus(result.message, result.ok ? "success" : "warning");
  if (result.ok) scrollToTop();
}

function handleRetryWrong() {
  if (!canRetryWrong.value) return;
  const name = appState.questionsJSON.name || "未命名题集";
  const ok = window.confirm(`确定仅保留《${name}》的错题并清空其答案？`);
  if (!ok) return;
  const result = applyRetryWrongQuestions(appState.questionsJSON);
  showStatus(result.message, result.ok ? "success" : "warning");
  if (result.ok) scrollToTop();
}
</script>

<template>
  <div class="container py-4 practice-page">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
      <div>
        <h2 class="mb-0 practice-bank-title">{{ appState.questionsJSON.name || "未命名题集" }}</h2>
        <div class="text-muted small">
          <span class="me-3">类型：{{ appState.questionsJSON.type || "-" }}</span>
          <span>作者：{{ appState.questionsJSON.author || "-" }}</span>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 justify-content-end">
        <template v-if="hasQuestions">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="!canSaveProgress"
            @click="handleSaveProgress"
          >
            <i class="fas fa-cloud-upload-alt me-1"></i>保存进度到浏览器
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="!canSaveToLocalBank"
            @click="handleSaveToLocalBank"
          >
            <i class="fas fa-book me-1"></i>保存到本地题库
          </button>
          <button
            type="button"
            class="btn btn-outline-warning btn-sm"
            :disabled="!canRedoAll"
            @click="handleRedoAll"
          >
            <i class="fas fa-undo me-1"></i>重做全卷
          </button>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            :disabled="!canRetryWrong"
            @click="handleRetryWrong"
          >
            <i class="fas fa-redo me-1"></i>重做错题
          </button>
        </template>
        <router-link class="btn btn-outline-secondary btn-sm" to="/question-bank">
          <i class="fas fa-arrow-left me-1"></i>返回题库
        </router-link>
      </div>
    </div>

    <div
      v-if="statusMessage"
      class="alert py-2 mb-3"
      :class="statusTone === 'success' ? 'alert-success' : statusTone === 'warning' ? 'alert-warning' : 'alert-info'"
      role="alert"
    >
      {{ statusMessage }}
    </div>

    <div v-if="!hasQuestions" class="card shadow-sm">
      <div class="card-body">
        <p class="mb-3">当前没有可做题目，请先在题库页选择题集并点击“开始做题”。</p>
        <router-link class="btn btn-primary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>前往题库
        </router-link>
      </div>
    </div>

    <div v-else>
      <AppQuestion :data="appState.questionsJSON" :appcolor="appState.webSiteConfig.appColor" />
    </div>
  </div>
</template>
