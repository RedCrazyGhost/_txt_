<script setup lang="ts">
import { saveAs } from "file-saver";
import { computed } from "vue";
import {
  buildWrongQuestionsExportJson,
  buildWrongQuestionsFilename,
  buildWrongQuestionsSet,
  getWrongQuestions
} from "../../models/question/wrongQuestions";
import { resetQuestionProgress } from "../../models/question/progress";
import { questionProgressState } from "../../state/questionProgressState";
import type { QuestionsJSON } from "../../state/appState";
import { numberToPercent } from "../../utils/questions";

type SummaryTone = "success" | "danger" | "secondary" | "primary";

interface SummaryItem {
  label: string;
  value: string | number;
  tone?: SummaryTone;
}

const props = withDefaults(
  defineProps<{
    bank: QuestionsJSON;
    label?: string;
    progressClass?: string;
    headerClass?: string;
  }>(),
  {
    label: "答题进度",
    progressClass: "",
    headerClass: ""
  }
);

const questions = computed(() =>
  Array.isArray(props.bank?.questions) ? props.bank.questions : []
);

const wrongQuestionCount = computed(() => getWrongQuestions(questions.value).length);

const canUseWrongActions = computed(() => wrongQuestionCount.value > 0);

const correctPercent = computed(() =>
  numberToPercent(questionProgressState.correctSlots, questionProgressState.totalSlots)
);

const wrongPercent = computed(() =>
  numberToPercent(questionProgressState.wrongSlots, questionProgressState.totalSlots)
);

const unansweredPercent = computed(() =>
  numberToPercent(questionProgressState.unansweredSlots, questionProgressState.totalSlots)
);

const accuracyPercent = computed(() => {
  if (!questionProgressState.attemptedSlots) return null;
  return numberToPercent(questionProgressState.correctSlots, questionProgressState.attemptedSlots);
});

const summaryItems = computed((): SummaryItem[] => [
  { label: "题目总数", value: questionProgressState.totalQuestions },
  { label: "已做题目", value: questionProgressState.attemptedQuestions },
  { label: "全对题目", value: questionProgressState.fullyCorrectQuestions },
  {
    label: "答题空位",
    value: `${questionProgressState.attemptedSlots}/${questionProgressState.totalSlots}`
  },
  { label: "正确", value: questionProgressState.correctSlots, tone: "success" },
  { label: "错误", value: questionProgressState.wrongSlots, tone: "danger" },
  { label: "未答", value: questionProgressState.unansweredSlots, tone: "secondary" },
  {
    label: "正确率",
    value: accuracyPercent.value === null ? "-" : `${accuracyPercent.value.toFixed(1)}%`,
    tone: "primary"
  }
]);

function exportWrongQuestions() {
  if (!canUseWrongActions.value) return;

  const json = buildWrongQuestionsExportJson(props.bank, questions.value);
  const filename = buildWrongQuestionsFilename(props.bank.name);
  saveAs(new Blob([json], { type: "application/json;charset=utf-8" }), filename);
}

function retryWrongQuestions() {
  if (!canUseWrongActions.value) return;

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
  <section class="question-progress-panel card shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-2" :class="headerClass">
        <span class="fw-semibold">{{ label }}</span>
        <span class="text-muted small">
          正确 {{ questionProgressState.correctSlots }} / 已答 {{ questionProgressState.attemptedSlots }} / 总计
          {{ questionProgressState.totalSlots }}
        </span>
      </div>
      <div class="progress question-progress-bar" :class="progressClass">
        <div
          class="progress-bar bg-success progress-bar-striped progress-bar-animated"
          role="progressbar"
          :style="{ width: `${correctPercent}%` }"
          :aria-valuenow="questionProgressState.correctSlots"
          :aria-valuemin="0"
          :aria-valuemax="questionProgressState.totalSlots"
        ></div>
        <div
          class="progress-bar bg-danger"
          role="progressbar"
          :style="{ width: `${wrongPercent}%` }"
          :aria-valuenow="questionProgressState.wrongSlots"
          :aria-valuemin="0"
          :aria-valuemax="questionProgressState.totalSlots"
        ></div>
        <div
          class="progress-bar bg-secondary bg-opacity-25"
          role="progressbar"
          :style="{ width: `${unansweredPercent}%` }"
          :aria-valuenow="questionProgressState.unansweredSlots"
          :aria-valuemin="0"
          :aria-valuemax="questionProgressState.totalSlots"
        ></div>
      </div>

      <div class="question-progress-summary row g-2 g-md-3 mt-3">
        <div
          v-for="item in summaryItems"
          :key="item.label"
          class="col-6 col-md-3"
        >
          <div class="question-progress-stat rounded border bg-body-tertiary px-3 py-2 h-100">
            <div class="text-muted small">{{ item.label }}</div>
            <div
              class="question-progress-stat-value fw-semibold"
              :class="item.tone ? `text-${item.tone}` : ''"
            >
              {{ item.value }}
            </div>
          </div>
        </div>
      </div>

      <div class="question-progress-actions d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
        <button
          type="button"
          class="btn btn-outline-danger btn-sm"
          :disabled="!canUseWrongActions"
          @click="exportWrongQuestions"
        >
          <i class="fas fa-file-export me-1"></i>导出错题 JSON
          <span v-if="wrongQuestionCount" class="ms-1">({{ wrongQuestionCount }})</span>
        </button>
        <button
          type="button"
          class="btn btn-danger btn-sm"
          :disabled="!canUseWrongActions"
          @click="retryWrongQuestions"
        >
          <i class="fas fa-redo me-1"></i>重做错题
          <span v-if="wrongQuestionCount" class="ms-1">({{ wrongQuestionCount }})</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.question-progress-panel {
  margin-top: 1.5rem;
}

.question-progress-bar {
  height: 0.85rem;
}

.question-progress-stat-value {
  font-size: 1.1rem;
  line-height: 1.3;
}
</style>
