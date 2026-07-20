<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { appState } from "../state/appState";
import AppQuestion from "../components/AppQuestion.vue";
import PracticeTimerBar from "../components/practice/PracticeTimerBar.vue";
import { questionProgressState } from "../state/questionProgressState";
import { usePracticeTimer, type ApplySessionConfigParams } from "../composables/usePracticeTimer";
import {
  applyRedoAllQuestions,
  applyRetryWrongQuestions,
  saveProgressToBrowser,
  saveQuestionBankToLocal
} from "../services/practicePageActions";

type StatusTone = "success" | "warning" | "info";

const statusMessage = ref("");
const statusTone = ref<StatusTone>("success");
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const hasQuestions = computed(
  () => Array.isArray(appState.questionsJSON.questions) && appState.questionsJSON.questions.length > 0
);

const canSaveProgress = computed(
  () => hasQuestions.value && Boolean(appState.questionsJSON.bankId)
);

const canSaveToLocalBank = computed(() => hasQuestions.value);

const canRedoAll = computed(() => questionProgressState.attemptedSlots > 0);

const canRetryWrong = computed(() => questionProgressState.wrongQuestionCount > 0);

const canRetryWrongWithPartial = computed(
  () =>
    questionProgressState.wrongQuestionCount + questionProgressState.partialQuestionCount > 0
);

function showStatus(message: string, tone: StatusTone = "success") {
  statusMessage.value = message;
  statusTone.value = tone;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMessage.value = "";
    statusTimer = null;
  }, 5000);
}

const {
  mode,
  durationSec,
  onEnd,
  running,
  locked,
  ended,
  displayText,
  isUrgent,
  pause,
  resume,
  reset,
  applySessionConfig
} = usePracticeTimer();

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
  if (result.ok) {
    reset();
    scrollToTop();
  }
}

function handleRetryWrong(includePartial = false) {
  const canRetry = includePartial ? canRetryWrongWithPartial.value : canRetryWrong.value;
  if (!canRetry) return;
  const name = appState.questionsJSON.name || "未命名题集";
  const label = includePartial ? "错题（含半对）" : "错题";
  const ok = window.confirm(`确定仅保留《${name}》的${label}并清空其答案？`);
  if (!ok) return;
  const result = applyRetryWrongQuestions(appState.questionsJSON, { includePartial });
  showStatus(result.message, result.ok ? "success" : "warning");
  if (result.ok) {
    reset();
    scrollToTop();
  }
}

function handleTimerReset() {
  reset();
}

function handleDismissLock() {
  applySessionConfig({ nextMode: "off" });
}

function handleApplySession(payload: ApplySessionConfigParams) {
  applySessionConfig(payload);
}

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
});
</script>

<template>
  <div class="container py-4 practice-page">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
      <div>
        <h2 class="mb-0 practice-bank-title">
          {{ hasQuestions ? appState.questionsJSON.name || "未命名题集" : "做题" }}
        </h2>
        <div v-if="hasQuestions" class="text-muted small">
          <span class="me-3">类型：{{ appState.questionsJSON.type || "-" }}</span>
          <span>作者：{{ appState.questionsJSON.author || "-" }}</span>
        </div>
        <p v-else class="text-muted small mb-0">
          从题库选题开始练习；未完成进度可在「全部记录」中继续。
        </p>
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
            @click="handleRetryWrong(false)"
          >
            <i class="fas fa-redo me-1"></i>重做错题
          </button>
          <button
            type="button"
            class="btn btn-outline-warning btn-sm"
            :disabled="!canRetryWrongWithPartial"
            @click="handleRetryWrong(true)"
          >
            <i class="fas fa-redo me-1"></i>重做错题（含半对）
          </button>
        </template>
        <router-link class="btn btn-outline-secondary btn-sm" to="/practice-progress">
          <i class="fas fa-history me-1"></i>全部记录
        </router-link>
        <router-link class="btn btn-outline-secondary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>{{ hasQuestions ? "返回题库" : "前往题库" }}
        </router-link>
      </div>
    </div>

    <div
      v-if="statusMessage"
      class="alert py-2 mb-3"
      :class="
        statusTone === 'success'
          ? 'alert-success'
          : statusTone === 'warning'
            ? 'alert-warning'
            : 'alert-info'
      "
      role="alert"
    >
      {{ statusMessage }}
    </div>

    <PracticeTimerBar
      v-if="hasQuestions"
      :mode="mode"
      :display-text="displayText"
      :running="running"
      :ended="ended"
      :locked="locked"
      :is-urgent="isUrgent"
      :duration-sec="durationSec"
      :on-end="onEnd"
      @pause="pause"
      @resume="resume"
      @reset="handleTimerReset"
      @apply-session="handleApplySession"
      @dismiss-lock="handleDismissLock"
    />

    <div v-if="!hasQuestions" class="card shadow-sm">
      <div class="card-body">
        <p class="mb-3">请先在题库选择题集并点击「开始做题」。</p>
        <router-link class="btn btn-primary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>前往题库
        </router-link>
      </div>
    </div>

    <div v-else>
      <AppQuestion
        :data="appState.questionsJSON"
        :appcolor="appState.webSiteConfig.appColor"
        :practice-locked="locked"
      />
    </div>
  </div>
</template>
