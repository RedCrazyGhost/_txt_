<script setup>
import { useWindowVirtualizer } from "@tanstack/vue-virtual";
import { computed, ref, watch, watchEffect } from "vue";
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
import { questionProgressState } from "../state/questionProgressState";

/** 超过此题数启用窗口虚拟滚动，保证大题集单页连续做题流畅 */
const VIRTUAL_SCROLL_THRESHOLD = 20;
const ESTIMATED_CARD_HEIGHT = 320;

const props = defineProps({
  data: { type: Object, required: true },
  appcolor: { type: String, default: "light" },
  showProgress: { type: Boolean, default: true }
});

const questions = computed(() =>
  Array.isArray(props.data?.questions) ? props.data.questions : []
);

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

const listRootRef = ref(null);
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

  let resizeObserver;
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

const peekingIndexes = ref(new Set());

function answerShow(question, qindex) {
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

function handleSlotChange(qindex, question, slotIndex) {
  notifySlotChanged(qindex, question, slotIndex);
}

function isPeeking(qindex) {
  return peekingIndexes.value.has(qindex);
}

function scrollToQuestion(index) {
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
        :key="virtualRow.key"
        :data-index="virtualRow.index"
        :ref="rowVirtualizer.measureElement"
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
          virtualized
          @slot-change="(slot) => handleSlotChange(virtualRow.index, questions[virtualRow.index], slot)"
          @peek-answer="answerShow(questions[virtualRow.index], virtualRow.index)"
        />
      </div>
    </div>

    <QuestionProgressFab v-if="showProgress && questions.length > 0" :bank="data" />
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
