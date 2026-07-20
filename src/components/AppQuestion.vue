<script setup lang="ts">
import { useWindowVirtualizer } from "@tanstack/vue-virtual";
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import QuestionCard from "./question/QuestionCard.vue";
import QuestionJumpFab from "./question/QuestionJumpFab.vue";
import QuestionProgressFab from "./question/QuestionProgressFab.vue";
import { buildPeekResults } from "../models/question/peekAnswer";
import {
  isTrackedQuestionUnanswered,
  notifySlotChanged,
  resetQuestionProgress,
  syncQuestionProgress
} from "../models/question/progress";
import {
  buildProgressRecord,
  getProgressRecord,
  saveProgressRecord,
  type BankSource
} from "../services/practiceProgress";
import { questionProgressState } from "../state/questionProgressState";
import type { QuestionsJSON } from "../state/appState";
import type { Question } from "../models/question/types";
import type { AppTheme } from "../services/appPrefsStorage";

/** 超过此题数启用窗口虚拟滚动，保证大题集单页连续做题流畅 */
const VIRTUAL_SCROLL_THRESHOLD = 20;
const ESTIMATED_CARD_HEIGHT = 320;

const props = withDefaults(
  defineProps<{
    data: QuestionsJSON;
    appcolor?: AppTheme;
    showProgress?: boolean;
    practiceLocked?: boolean;
  }>(),
  {
    appcolor: "light",
    showProgress: true,
    practiceLocked: false
  }
);

const questions = computed<Question[]>(() =>
  Array.isArray(props.data?.questions) ? props.data.questions : []
);

const bankContext = computed(() => ({
  name: props.data?.name || "",
  type: props.data?.type || "",
  author: props.data?.author || "",
  bankId: props.data?.bankId || "",
  bankSource: props.data?.bankSource || "",
  version: props.data?.version || ""
}));

const unansweredIndexes = computed(() => questionProgressState.unansweredQuestionIndexes);

watch(
  () => [props.data?.questions, props.data?.questions?.length],
  ([next]) => {
    if (Array.isArray(next)) resetQuestionProgress(next);
  },
  { immediate: true }
);

const useVirtualScroll = computed(
  () => questions.value.length >= VIRTUAL_SCROLL_THRESHOLD
);

const listRootRef = ref<HTMLElement | null>(null);
const scrollMargin = ref(0);

watchEffect((onCleanup) => {
  const root = listRootRef.value;
  if (!root) {
    scrollMargin.value = 0;
    return;
  }

  const updateScrollMargin = () => {
    scrollMargin.value = root.offsetTop;
  };

  updateScrollMargin();
  if (typeof window === "undefined") return;

  window.addEventListener("resize", updateScrollMargin);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(updateScrollMargin);
    resizeObserver.observe(root);
  }

  onCleanup(() => {
    window.removeEventListener("resize", updateScrollMargin);
    resizeObserver?.disconnect();
  });
});

const rowVirtualizer = useWindowVirtualizer(
  computed(() => ({
    count: questions.value.length,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 4,
    scrollMargin: scrollMargin.value,
    gap: 48
  }))
);

const virtualItems = computed(() => rowVirtualizer.value.getVirtualItems());
const totalVirtualHeight = computed(() => rowVirtualizer.value.getTotalSize());

const peekingIndexes = ref(new Set<number>());
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistProgress(forceQuestionsSnapshot = false) {
  if (typeof window === "undefined") return;
  if (!props.data?.bankId || !questions.value.length) return;

  const bankSource = (props.data.bankSource || "session") as BankSource;
  let includeQuestionsSnapshot = false;
  if (bankSource === "session") {
    if (forceQuestionsSnapshot) {
      includeQuestionsSnapshot = true;
    } else {
      const existing = getProgressRecord(props.data.bankId);
      includeQuestionsSnapshot = !Array.isArray(existing?.questions) || existing.questions.length === 0;
    }
  }

  const record = buildProgressRecord(
    {
      bankId: props.data.bankId,
      bankSource,
      name: props.data.name,
      type: props.data.type,
      author: props.data.author,
      version: props.data.version
    },
    questions.value,
    { includeQuestionsSnapshot }
  );
  saveProgressRecord(record);
}

function schedulePersistProgress() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistProgress(false);
  }, 400);
}

function flushPersistProgress() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  persistProgress(true);
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    flushPersistProgress();
  }
}

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("visibilitychange", handleVisibilityChange);
  }
});

onBeforeUnmount(() => {
  flushPersistProgress();
  if (typeof window !== "undefined") {
    window.removeEventListener("visibilitychange", handleVisibilityChange);
  }
});

function answerShow(question: Question, qindex: number) {
  const oldValue = [...(question.results || [])];
  question.results = buildPeekResults(question);
  peekingIndexes.value = new Set([...peekingIndexes.value, qindex]);
  setTimeout(() => {
    question.results = oldValue;
    syncQuestionProgress(qindex, question);
    const next = new Set(peekingIndexes.value);
    next.delete(qindex);
    peekingIndexes.value = next;
  }, 5000);
}

function handleSlotChange(qindex: number, question: Question, slotIndex: number) {
  if (props.practiceLocked) return;
  notifySlotChanged(qindex, question, slotIndex);
  schedulePersistProgress();
}

function isPeeking(qindex: number) {
  return peekingIndexes.value.has(qindex);
}

function measureVirtualRow(node: unknown) {
  rowVirtualizer.value.measureElement(node as Element | null);
}

function scrollToQuestion(index: number) {
  if (index < 0 || index >= questions.value.length) return;

  if (useVirtualScroll.value) {
    rowVirtualizer.value.scrollToIndex(index, { align: "center", behavior: "smooth" });
    return;
  }

  const el = listRootRef.value?.querySelector(`[data-question-index="${index}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
</script>

<template>
  <div ref="listRootRef" class="question-list-shell">
    <QuestionJumpFab
      v-if="questions.length > 0"
      :total="questions.length"
      :unanswered-indexes="unansweredIndexes"
      @jump="scrollToQuestion"
    />
    <QuestionProgressFab v-if="showProgress && questions.length > 0" :bank="data" />

    <template v-if="!useVirtualScroll">
      <div
        v-for="(question, qindex) in questions"
        :key="`question-${qindex}`"
        :data-question-index="qindex"
      >
        <QuestionCard
          :question="question"
          :qindex="qindex"
          :appcolor="appcolor"
          :peeking="isPeeking(qindex)"
          :unanswered-highlight="isTrackedQuestionUnanswered(qindex)"
          :bank-context="bankContext"
          :practice-locked="practiceLocked"
          @slot-change="(slot) => handleSlotChange(qindex, question, slot)"
          @peek-answer="answerShow(question, qindex)"
        />
      </div>
    </template>

    <div
      v-else
      class="question-virtual-list"
      :style="{ height: `${totalVirtualHeight}px` }"
    >
      <div
        v-for="virtualRow in virtualItems"
        :key="String(virtualRow.key)"
        :data-index="virtualRow.index"
        :ref="measureVirtualRow"
        class="question-virtual-item"
        :style="{
          transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`
        }"
      >
        <QuestionCard
          :question="questions[virtualRow.index]"
          :qindex="virtualRow.index"
          :appcolor="appcolor"
          :peeking="isPeeking(virtualRow.index)"
          :unanswered-highlight="isTrackedQuestionUnanswered(virtualRow.index)"
          :bank-context="bankContext"
          :practice-locked="practiceLocked"
          virtualized
          @slot-change="(slot) => handleSlotChange(virtualRow.index, questions[virtualRow.index], slot)"
          @peek-answer="answerShow(questions[virtualRow.index], virtualRow.index)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-virtual-list {
  position: relative;
  width: 100%;
}

.question-virtual-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
</style>
