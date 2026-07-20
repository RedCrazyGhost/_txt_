<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  FillBlankQuestion,
  JudgmentQuestion,
  MultipleChoiceQuestion,
  Question,
  SingleChoiceQuestion
} from "../../models/question/types";
import FillBlankQuestionBody from "./FillBlankQuestionBody.vue";
import MultipleChoiceQuestionBody from "./MultipleChoiceQuestionBody.vue";
import QuestionAiChat from "./QuestionAiChat.vue";
import QuestionExplanation from "./QuestionExplanation.vue";
import QuestionReportModal from "./QuestionReportModal.vue";
import SingleChoiceQuestionBody from "./SingleChoiceQuestionBody.vue";
import { shouldShowExplanationPanel } from "../../models/question/feedback";
import { getQuestionTypeBadgeClass, getQuestionTypeLabel } from "../../models/question/labels";
import type { AppTheme } from "../../services/appPrefsStorage";
import type { QuestionReportBankInfo } from "../../services/questionReport";
import { getAnswerSlotCount, getQuestionType, judgeSlotOutcome, type SlotOutcome } from "../../utils/questions";

const props = withDefaults(
  defineProps<{
    question: Question;
    qindex: number;
    appcolor?: AppTheme;
    peeking?: boolean;
    virtualized?: boolean;
    unansweredHighlight?: boolean;
    bankContext?: QuestionReportBankInfo;
    practiceLocked?: boolean;
  }>(),
  {
    appcolor: "light",
    peeking: false,
    virtualized: false,
    unansweredHighlight: false,
    bankContext: () => ({}),
    practiceLocked: false
  }
);

const emit = defineEmits<{
  slotChange: [slot: number];
  peekAnswer: [];
}>();

const reportModalRef = ref<{ open: () => void } | null>(null);
const aiChatOpen = ref(false);

function toggleAiChat() {
  aiChatOpen.value = !aiChatOpen.value;
}

const attemptedSlotFeedback = computed(() => {
  const question = props.question;
  const slotCount = getAnswerSlotCount(question);
  const entries = [];

  for (let index = 0; index < slotCount; index += 1) {
    const value = question.results?.[index];
    const attempted =
      value !== undefined && value !== null && String(value).trim() !== "";
    if (!attempted) continue;
    entries.push({ index, outcome: judgeSlotOutcome(question, index) });
  }

  return entries;
});

const answerStatusIconClass = computed(() => {
  const feedback = attemptedSlotFeedback.value;
  if (!feedback.length) return "";

  const slotCount = getAnswerSlotCount(props.question);
  const allCorrect =
    feedback.every((entry) => entry.outcome === "correct") && feedback.length === slotCount;
  if (allCorrect) return "fas fa-check fa-3x text-success";

  const hasWrong = feedback.some((entry) => entry.outcome === "wrong");
  if (hasWrong) return "fas fa-exclamation fa-3x text-danger";

  return "fas fa-exclamation fa-3x text-warning";
});

const showExplanation = computed(() =>
  shouldShowExplanationPanel(props.question, props.peeking)
);

function judgeColorChangeFontColor(color: AppTheme): AppTheme {
  return color === "light" ? "dark" : "light";
}

function outcomeLabel(outcome: SlotOutcome) {
  if (outcome === "correct") return "正确";
  if (outcome === "partial") return "半对";
  return "错误";
}

function resultColor(outcome: SlotOutcome) {
  if (outcome === "correct") return "var(--bs-green)";
  if (outcome === "partial") return "var(--bs-warning)";
  return "var(--bs-red)";
}

function isSingleChoice(question: Question): question is SingleChoiceQuestion | JudgmentQuestion {
  return question.questionType === "singleChoice" || question.questionType === "judgment";
}

function isMultipleChoice(question: Question): question is MultipleChoiceQuestion {
  return question.questionType === "multipleChoice";
}

type QuestionResults = Array<string | undefined>;

function singleChoiceQuestion(
  question: SingleChoiceQuestion | JudgmentQuestion
): (SingleChoiceQuestion | JudgmentQuestion) & { results: QuestionResults } {
  return question as (SingleChoiceQuestion | JudgmentQuestion) & { results: QuestionResults };
}

function multipleChoiceQuestion(
  question: MultipleChoiceQuestion
): MultipleChoiceQuestion & { results: QuestionResults } {
  return question as MultipleChoiceQuestion & { results: QuestionResults };
}

function fillBlankQuestion(question: Question): FillBlankQuestion & { results: QuestionResults } {
  return question as FillBlankQuestion & { results: QuestionResults };
}

function typeLabel(question: Question) {
  return getQuestionTypeLabel(getQuestionType(question));
}

function typeBadgeClass(question: Question) {
  return getQuestionTypeBadgeClass(getQuestionType(question));
}

function openReportModal() {
  reportModalRef.value?.open();
}
</script>

<template>
  <div
    class="card h-100 shadow-sm rounded question-card"
    :class="{
      'question-card-virtualized': virtualized,
      'question-card-unanswered': unansweredHighlight
    }"
  >
    <div class="card-header d-flex justify-content-between align-items-center gap-2">
      <span>题目 {{ qindex + 1 }}</span>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm question-ai-btn"
          title="AI 对话"
          aria-label="AI 对话"
          :aria-expanded="aiChatOpen"
          @click="toggleAiChat"
        >
          <i class="fas fa-robot me-1"></i>AI
          <i
            class="fas fa-chevron-down ms-1 question-ai-btn-chevron"
            :class="{ 'question-ai-btn-chevron--open': aiChatOpen }"
            aria-hidden="true"
          ></i>
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm question-report-btn"
          title="上报题目问题"
          aria-label="上报题目问题"
          @click="openReportModal"
        >
          <i class="fas fa-flag me-1"></i>上报
        </button>
        <span v-if="practiceLocked" class="badge text-bg-danger">已停止</span>
        <span
          v-else-if="unansweredHighlight"
          class="badge text-bg-warning question-unanswered-badge"
        >未做</span>
        <span class="badge question-type-badge" :class="typeBadgeClass(question)">{{ typeLabel(question) }}</span>
      </div>
    </div>
    <img
      v-if="question.image !== ''"
      :src="question.image"
      class="card-img-top"
      :alt="`question-image-${qindex}`"
    />
    <i
      v-if="answerStatusIconClass"
      :class="`position-absolute top-0 start-100 translate-middle ${answerStatusIconClass}`"
    ></i>
    <div class="card-body">
      <span
        class="fa-stack fa-lg position-absolute top-100 start-100 translate-middle"
        v-if="!question.MD5 && !practiceLocked"
        @click="emit('peekAnswer')"
      >
        <i :class="`fa fa-camera fa-stack-1x text-${judgeColorChangeFontColor(appcolor)}`"></i>
        <i class="fas fa-ban fa-stack-2x text-danger"></i>
      </span>
      <fieldset class="question-card-fieldset" :disabled="practiceLocked">
        <SingleChoiceQuestionBody
          v-if="isSingleChoice(question)"
          :question="singleChoiceQuestion(question)"
          :qindex="qindex"
          @slot-change="(slot) => emit('slotChange', slot)"
        />
        <MultipleChoiceQuestionBody
          v-else-if="isMultipleChoice(question)"
          :question="multipleChoiceQuestion(question)"
          :qindex="qindex"
          @slot-change="(slot) => emit('slotChange', slot)"
        />
        <FillBlankQuestionBody
          v-else
          :question="fillBlankQuestion(question)"
          :qindex="qindex"
          @slot-change="(slot) => emit('slotChange', slot)"
        />
      </fieldset>
      <QuestionExplanation
        v-if="showExplanation"
        :question="question"
        :peeking="peeking"
      />
      <QuestionAiChat
        v-model:open="aiChatOpen"
        :question="question"
        :qindex="qindex"
        :bank-context="bankContext"
      />
    </div>
    <div v-if="attemptedSlotFeedback.length" class="card-footer">
      <small class="text-muted">
        <span
          v-for="entry in attemptedSlotFeedback"
          :key="`result-${entry.index}`"
          :style="`color:${resultColor(entry.outcome)};margin-right:8px;`"
        >
          第{{ entry.index + 1 }}个：{{ outcomeLabel(entry.outcome) }}
        </span>
      </small>
    </div>
    <QuestionReportModal
      ref="reportModalRef"
      :question="question"
      :qindex="qindex"
      :bank-context="bankContext"
    />
  </div>
</template>

<style scoped>
.question-card {
  margin-bottom: 3rem;
}

.question-card-virtualized {
  margin-bottom: 0;
}

.question-card-virtualized {
  margin-bottom: 0;
}

.question-card-unanswered {
  border: 2px solid var(--bs-warning);
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-warning-rgb), 0.2);
}

.question-unanswered-badge {
  font-size: 0.7rem;
  font-weight: 600;
}

.question-card-unanswered {
  border: 2px solid var(--bs-warning);
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-warning-rgb), 0.2);
}

.question-unanswered-badge {
  font-size: 0.7rem;
  font-weight: 600;
}

.question-type-badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.question-report-btn {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
}

.question-card-fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-inline-size: 0;
}

.question-ai-btn {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
}

.question-ai-btn-chevron {
  font-size: 0.625rem;
  transition: transform 0.2s ease;
}

.question-ai-btn-chevron--open {
  transform: rotate(180deg);
}

.question-ai-btn {
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
}

.question-ai-btn-chevron {
  font-size: 0.625rem;
  transition: transform 0.2s ease;
}

.question-ai-btn-chevron--open {
  transform: rotate(180deg);
}
</style>
