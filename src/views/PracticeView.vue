<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { appState } from "../state/appState";
import AppQuestion from "../components/AppQuestion.vue";
import PracticeTimerBar from "../components/practice/PracticeTimerBar.vue";
import PracticePageToolbar from "../components/practice/PracticePageToolbar.vue";
import GenerateWrongNotebookModal, {
  type GenerateWrongNotebookTarget
} from "../components/practice/GenerateWrongNotebookModal.vue";
import { questionProgressState } from "../state/questionProgressState";
import { usePracticeTimer, type ApplySessionConfigParams } from "../composables/usePracticeTimer";
import {
  applyRedoAllQuestions,
  applyRetryWrongQuestions,
  saveProgressToBrowser,
  saveQuestionBankToLocal
} from "../services/practicePageActions";
import {
  PracticeMode,
  getPracticeModeLabel,
  getNotebookKindLabel,
  NotebookKind,
  type BankLike
} from "../services/practiceProgress";
import { questionBankState } from "../state/questionBankState";

type StatusTone = "success" | "warning" | "info";

const statusMessage = ref("");
const statusTone = ref<StatusTone>("success");
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const wrongModalOpen = ref(false);

const hasQuestions = computed(
  () => Array.isArray(appState.questionsJSON.questions) && appState.questionsJSON.questions.length > 0
);

const practiceMode = computed(
  () => appState.questionsJSON.practiceMode || PracticeMode.RESUME
);

const modeLabel = computed(() => getPracticeModeLabel(practiceMode.value));

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

const canGenerateWrong = computed(
  () => canRetryWrong.value || canRetryWrongWithPartial.value
);

const wrongWithPartialCount = computed(
  () => questionProgressState.wrongQuestionCount + questionProgressState.partialQuestionCount
);

const backToBankLabel = computed(() => (hasQuestions.value ? "返回题库" : "前往题库"));

const wrongModalTarget = computed<GenerateWrongNotebookTarget | null>(() => {
  if (!wrongModalOpen.value || !hasQuestions.value) return null;
  const kind =
    practiceMode.value === PracticeMode.WRONG ? NotebookKind.WRONG : NotebookKind.PRACTICE;
  return {
    key: appState.questionsJSON.notebookId || appState.questionsJSON.bankId || "current",
    name: appState.questionsJSON.name || "未命名题集",
    kindLabel: getNotebookKindLabel(kind),
    wrongQuestionCount: questionProgressState.wrongQuestionCount,
    wrongWithPartialCount: wrongWithPartialCount.value
  };
});

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

function requestWrongNotebook() {
  if (!canGenerateWrong.value) return;
  wrongModalOpen.value = true;
}

function cancelWrongNotebook() {
  wrongModalOpen.value = false;
}

function confirmWrongNotebook(includePartial = false) {
  const canRetry = includePartial ? canRetryWrongWithPartial.value : canRetryWrong.value;
  if (!canRetry) return;
  wrongModalOpen.value = false;
  const banks = [...questionBankState.localBanks, ...questionBankState.remoteBanks] as BankLike[];
  const result = applyRetryWrongQuestions(appState.questionsJSON, {
    includePartial,
    banks
  });
  showStatus(result.message, result.ok ? "success" : "warning");
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
          <span class="me-3">作者：{{ appState.questionsJSON.author || "-" }}</span>
          <span class="badge text-bg-light border">{{ modeLabel }}</span>
        </div>
        <p v-else class="text-muted small mb-0">
          从题库选题开始练习；未完成做题本可在「练习档案」中继续。
        </p>
      </div>
      <PracticePageToolbar
        :has-questions="hasQuestions"
        :can-save-progress="canSaveProgress"
        :can-save-to-local-bank="canSaveToLocalBank"
        :can-redo-all="canRedoAll"
        :can-generate-wrong="canGenerateWrong"
        :back-to-bank-label="backToBankLabel"
        @save-progress="handleSaveProgress"
        @save-to-local-bank="handleSaveToLocalBank"
        @redo-all="handleRedoAll"
        @request-wrong="requestWrongNotebook"
      />
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

    <GenerateWrongNotebookModal
      :target="wrongModalTarget"
      @cancel="cancelWrongNotebook"
      @confirm="confirmWrongNotebook"
    />
  </div>
</template>
