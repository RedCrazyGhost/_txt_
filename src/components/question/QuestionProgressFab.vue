<script setup>
import { saveAs } from "file-saver";
import { computed } from "vue";
import {
  buildPracticeRecordExportJson,
  buildPracticeRecordFilename
} from "../../models/question/practiceExport";
import {
  buildWrongQuestionsExportJson,
  buildWrongQuestionsFilename,
  buildWrongQuestionsSet
} from "../../models/question/wrongQuestions";
import { resetQuestionProgress } from "../../models/question/progress";
import { questionProgressState } from "../../state/questionProgressState";
import { numberToPercent } from "../../utils/questions";

const props = defineProps({
  bank: { type: Object, required: true }
});

const questions = computed(() =>
  Array.isArray(props.bank?.questions) ? props.bank.questions : []
);

const progress = computed(() => ({
  totalQuestions: questionProgressState.totalQuestions,
  attemptedQuestions: questionProgressState.attemptedQuestions,
  fullyCorrectQuestions: questionProgressState.fullyCorrectQuestions,
  totalSlots: questionProgressState.totalSlots,
  attemptedSlots: questionProgressState.attemptedSlots,
  correctSlots: questionProgressState.correctSlots,
  wrongSlots: questionProgressState.wrongSlots,
  unansweredSlots: questionProgressState.unansweredSlots,
  unansweredQuestionCount: questionProgressState.unansweredQuestionIndexes.length,
  wrongQuestionCount: questionProgressState.wrongQuestionCount
}));

const canExportWrong = computed(() => progress.value.wrongQuestionCount > 0);

const canExportPractice = computed(() => progress.value.attemptedSlots > 0);

const canRetryWrong = computed(() => progress.value.wrongQuestionCount > 0);

const correctPercent = computed(() =>
  numberToPercent(progress.value.correctSlots, progress.value.totalSlots)
);

const wrongPercent = computed(() =>
  numberToPercent(progress.value.wrongSlots, progress.value.totalSlots)
);

const unansweredPercent = computed(() =>
  numberToPercent(progress.value.unansweredSlots, progress.value.totalSlots)
);

const accuracyText = computed(() => {
  if (!progress.value.attemptedSlots) return "-";
  return `${numberToPercent(progress.value.correctSlots, progress.value.attemptedSlots).toFixed(1)}%`;
});

const summaryItems = computed(() => [
  { label: "题目总数", value: progress.value.totalQuestions },
  { label: "已做题目", value: progress.value.attemptedQuestions },
  { label: "全对题目", value: progress.value.fullyCorrectQuestions },
  { label: "未做题目", value: progress.value.unansweredQuestionCount },
  {
    label: "答题空位",
    value: `${progress.value.attemptedSlots}/${progress.value.totalSlots}`
  },
  { label: "正确", value: progress.value.correctSlots, tone: "success" },
  { label: "错误", value: progress.value.wrongSlots, tone: "danger" },
  { label: "未答空位", value: progress.value.unansweredSlots, tone: "secondary" },
  { label: "正确率", value: accuracyText.value, tone: "primary" }
]);

function exportWrongQuestions() {
  if (!canExportWrong.value) return;
  const json = buildWrongQuestionsExportJson(props.bank, questions.value);
  const filename = buildWrongQuestionsFilename(props.bank.name);
  saveAs(new Blob([json], { type: "application/json;charset=utf-8" }), filename);
}

function exportPracticeRecord() {
  if (!canExportPractice.value) return;
  const json = buildPracticeRecordExportJson(props.bank, questions.value);
  const filename = buildPracticeRecordFilename(props.bank.name);
  saveAs(new Blob([json], { type: "application/json;charset=utf-8" }), filename);
}

function retryWrongQuestions() {
  if (!canRetryWrong.value) return;

  const retrySet = buildWrongQuestionsSet(props.bank, questions.value, { clearResults: true });
  props.bank.name = retrySet.name;
  props.bank.type = retrySet.type;
  props.bank.author = retrySet.author;
  props.bank.version = retrySet.version;
  props.bank.questions = retrySet.questions;
  resetQuestionProgress(retrySet.questions);

  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
</script>

<template>
  <div class="question-progress-fab">
    <div class="question-progress-fab-panel">
      <div class="question-progress-fab-header">
        <span class="question-progress-fab-icon" aria-hidden="true">
          <i class="fas fa-chart-pie"></i>
        </span>
      </div>

      <div class="question-progress-fab-body">
        <div class="question-progress-fab-headline">
          <div class="question-progress-fab-title">答题进度</div>
          <div class="question-progress-fab-subtitle">
            正确 {{ progress.correctSlots }} · 已答 {{ progress.attemptedSlots }} · 总计
            {{ progress.totalSlots }}
          </div>
        </div>

        <div class="progress question-progress-fab-bar">
          <div class="progress-bar bg-success" :style="{ width: `${correctPercent}%` }"></div>
          <div class="progress-bar bg-danger" :style="{ width: `${wrongPercent}%` }"></div>
          <div
            class="progress-bar bg-secondary bg-opacity-25"
            :style="{ width: `${unansweredPercent}%` }"
          ></div>
        </div>

        <div class="question-progress-fab-legend">
          <span><i class="legend-dot legend-dot-success"></i>正确 {{ correctPercent.toFixed(1) }}%</span>
          <span><i class="legend-dot legend-dot-danger"></i>错误 {{ wrongPercent.toFixed(1) }}%</span>
          <span><i class="legend-dot legend-dot-muted"></i>未答 {{ unansweredPercent.toFixed(1) }}%</span>
        </div>

        <div class="question-progress-fab-grid">
          <div
            v-for="item in summaryItems"
            :key="item.label"
            class="question-progress-fab-stat"
          >
            <div class="question-progress-fab-stat-label">{{ item.label }}</div>
            <div
              class="question-progress-fab-stat-value"
              :class="item.tone ? `text-${item.tone}` : ''"
            >
              {{ item.value }}
            </div>
          </div>
        </div>

        <div class="question-progress-fab-actions">
          <button
            type="button"
            class="btn btn-outline-danger"
            :disabled="!canExportWrong"
            @click="exportWrongQuestions"
          >
            <i class="fas fa-file-export me-1"></i>导出错题
            <span v-if="wrongQuestionCount" class="ms-1">({{ wrongQuestionCount }})</span>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            :disabled="!canExportPractice"
            @click="exportPracticeRecord"
          >
            <i class="fas fa-save me-1"></i>导出做题记录
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="!canRetryWrong"
            @click="retryWrongQuestions"
          >
            <i class="fas fa-redo me-1"></i>重做错题
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-progress-fab {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 1040;
  max-width: calc(100vw - 24px);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.question-progress-fab-panel {
  width: 42px;
  border-radius: 21px;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  transition:
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s ease,
    border-radius 0.25s ease;
}

.question-progress-fab:hover .question-progress-fab-panel,
.question-progress-fab:focus-within .question-progress-fab-panel {
  width: min(360px, calc(100vw - 24px));
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
}

.question-progress-fab-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 42px;
}

.question-progress-fab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--bs-primary);
  font-size: 1rem;
}

.question-progress-fab-body {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding: 0 14px;
  pointer-events: none;
  transition:
    max-height 0.4s ease,
    opacity 0.25s ease 0.05s,
    padding 0.25s ease;
}

.question-progress-fab:hover .question-progress-fab-body,
.question-progress-fab:focus-within .question-progress-fab-body {
  max-height: 520px;
  opacity: 1;
  padding: 0 14px 14px;
  pointer-events: auto;
}

.question-progress-fab-headline {
  margin-bottom: 10px;
}

.question-progress-fab-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.question-progress-fab-subtitle {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

.question-progress-fab-bar {
  height: 0.85rem;
  margin-bottom: 8px;
}

.question-progress-fab-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  font-size: 0.8rem;
  color: var(--bs-secondary);
  margin-bottom: 12px;
}

.legend-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.legend-dot-success {
  background: var(--bs-success);
}

.legend-dot-danger {
  background: var(--bs-danger);
}

.legend-dot-muted {
  background: var(--bs-secondary);
  opacity: 0.45;
}

.question-progress-fab-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-bottom: 12px;
}

.question-progress-fab-stat {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-tertiary-bg);
  padding: 0.55rem 0.65rem;
  min-height: 3.4rem;
}

.question-progress-fab-stat-label {
  font-size: 0.75rem;
  color: var(--bs-secondary);
  margin-bottom: 0.15rem;
}

.question-progress-fab-stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
}

.question-progress-fab-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.question-progress-fab-actions .btn {
  font-size: 0.875rem;
  padding: 0.45rem 0.75rem;
}

:global([data-bs-theme="dark"]) .question-progress-fab-panel {
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
}

:global([data-bs-theme="dark"]) .question-progress-fab:hover .question-progress-fab-panel,
:global([data-bs-theme="dark"]) .question-progress-fab:focus-within .question-progress-fab-panel {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
}
</style>
