<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { questionProgressState } from "../../state/questionProgressState";
import type { QuestionsJSON } from "../../state/appState";
import { numberToPercent } from "../../utils/questions";

const COMPACT_MEDIA_QUERY = "(max-width: 576px), (hover: none)";

type SummaryTone = "success" | "warning" | "danger" | "secondary" | "primary";

interface SummaryItem {
  label: string;
  value: string | number;
  tone?: SummaryTone;
}

defineProps<{
  bank: QuestionsJSON;
}>();

const panelRef = ref<HTMLElement | null>(null);
const expanded = ref(false);
const isCompactUi = ref(false);
const hoverDismissed = ref(false);

let compactMediaQuery: MediaQueryList | null = null;

const progress = computed(() => ({
  totalQuestions: questionProgressState.totalQuestions,
  attemptedQuestions: questionProgressState.attemptedQuestions,
  fullyCorrectQuestions: questionProgressState.fullyCorrectQuestions,
  totalSlots: questionProgressState.totalSlots,
  attemptedSlots: questionProgressState.attemptedSlots,
  correctSlots: questionProgressState.correctSlots,
  partialSlots: questionProgressState.partialSlots,
  wrongSlots: questionProgressState.wrongSlots,
  unansweredSlots: questionProgressState.unansweredSlots,
  unansweredQuestionCount: questionProgressState.unansweredQuestionIndexes.length,
  wrongQuestionCount: questionProgressState.wrongQuestionCount,
  partialQuestionCount: questionProgressState.partialQuestionCount
}));

const correctPercent = computed(() =>
  numberToPercent(progress.value.correctSlots, progress.value.totalSlots)
);

const partialPercent = computed(() =>
  numberToPercent(progress.value.partialSlots, progress.value.totalSlots)
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

const summaryItems = computed((): SummaryItem[] => [
  { label: "题目总数", value: progress.value.totalQuestions },
  { label: "已做题目", value: progress.value.attemptedQuestions },
  { label: "全对题目", value: progress.value.fullyCorrectQuestions },
  { label: "未做题目", value: progress.value.unansweredQuestionCount },
  {
    label: "答题空位",
    value: `${progress.value.attemptedSlots}/${progress.value.totalSlots}`
  },
  { label: "正确", value: progress.value.correctSlots, tone: "success" },
  { label: "半对", value: progress.value.partialSlots, tone: "warning" },
  { label: "错误", value: progress.value.wrongSlots, tone: "danger" },
  { label: "未答空位", value: progress.value.unansweredSlots, tone: "secondary" },
  { label: "正确率", value: accuracyText.value, tone: "primary" }
]);

function syncCompactUi() {
  isCompactUi.value = compactMediaQuery?.matches ?? false;
  if (!isCompactUi.value) {
    expanded.value = false;
  }
}

function blurPanelFocus() {
  const panel = panelRef.value;
  const active = document.activeElement;
  if (panel && active instanceof HTMLElement && panel.contains(active)) {
    active.blur();
  }
}

function toggleExpanded() {
  if (!isCompactUi.value) return;
  expanded.value = !expanded.value;
  if (!expanded.value) {
    blurPanelFocus();
  }
}

function closeExpanded() {
  if (!expanded.value) return;
  expanded.value = false;
  blurPanelFocus();
}

function handleClose() {
  if (isCompactUi.value) {
    closeExpanded();
    return;
  }
  hoverDismissed.value = true;
  blurPanelFocus();
}

function onFabMouseLeave() {
  hoverDismissed.value = false;
}

onMounted(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  compactMediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
  syncCompactUi();
  compactMediaQuery.addEventListener("change", syncCompactUi);
});

onUnmounted(() => {
  compactMediaQuery?.removeEventListener("change", syncCompactUi);
});
</script>

<template>
  <div
    class="question-progress-fab"
    :class="{
      'is-expanded': expanded,
      'is-compact': isCompactUi,
      'is-hover-dismissed': hoverDismissed
    }"
    @mouseleave="onFabMouseLeave"
  >
    <div
      ref="panelRef"
      class="question-progress-fab-panel"
      :role="isCompactUi && expanded ? 'dialog' : undefined"
      :aria-modal="isCompactUi && expanded ? 'true' : undefined"
      aria-labelledby="question-progress-fab-title"
    >
      <div class="question-progress-fab-header">
        <button
          v-if="!(isCompactUi && expanded)"
          type="button"
          class="question-progress-fab-toggle"
          aria-label="答题进度"
          :aria-expanded="isCompactUi ? expanded : undefined"
          @click="toggleExpanded"
        >
          <span class="question-progress-fab-icon" aria-hidden="true">
            <i class="fas fa-chart-pie"></i>
          </span>
        </button>
      </div>

      <div class="question-progress-fab-body">
        <div class="question-progress-fab-headline">
          <div class="question-progress-fab-headline-row">
            <div id="question-progress-fab-title" class="question-progress-fab-title">答题进度</div>
            <button
              v-if="isCompactUi ? expanded : true"
              type="button"
              class="question-progress-fab-close question-progress-fab-close-inline"
              aria-label="关闭"
              @click="handleClose"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="question-progress-fab-subtitle">
            正确 {{ progress.correctSlots }} · 半对 {{ progress.partialSlots }} · 已答
            {{ progress.attemptedSlots }} · 总计 {{ progress.totalSlots }}
          </div>
        </div>

        <div class="progress question-progress-fab-bar">
          <div class="progress-bar bg-success" :style="{ width: `${correctPercent}%` }"></div>
          <div class="progress-bar bg-warning" :style="{ width: `${partialPercent}%` }"></div>
          <div class="progress-bar bg-danger" :style="{ width: `${wrongPercent}%` }"></div>
          <div
            class="progress-bar bg-secondary bg-opacity-25"
            :style="{ width: `${unansweredPercent}%` }"
          ></div>
        </div>

        <div class="question-progress-fab-legend">
          <span><i class="legend-dot legend-dot-success"></i>正确 {{ correctPercent.toFixed(1) }}%</span>
          <span><i class="legend-dot legend-dot-warning"></i>半对 {{ partialPercent.toFixed(1) }}%</span>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-progress-fab {
  --fab-edge: var(--app-fab-edge, 12px);
  --fab-bottom: var(--app-fab-bottom, 12px);
  --fab-safe-bottom: env(safe-area-inset-bottom, 0px);
  --fab-safe-right: env(safe-area-inset-right, 0px);
  --fab-safe-left: env(safe-area-inset-left, 0px);
  --fab-safe-top: env(safe-area-inset-top, 0px);
  --fab-max-width: calc(100vw - var(--fab-edge) * 2 - var(--fab-safe-left) - var(--fab-safe-right));
  --fab-max-height: var(
    --app-fab-max-height,
    calc(100dvh - var(--fab-bottom) - var(--fab-edge) - var(--fab-safe-top))
  );

  position: fixed;
  bottom: var(--fab-bottom);
  right: calc(var(--fab-edge) + var(--fab-safe-right));
  z-index: 1040;
  max-width: var(--fab-max-width);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.question-progress-fab-panel {
  width: 42px;
  border-radius: 21px;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  overflow: hidden;
  transform-origin: 100% 100%;
  transition:
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.25s ease,
    box-shadow 0.25s ease;
}

.question-progress-fab.is-compact .question-progress-fab-panel {
  max-height: 42px;
  display: flex;
  flex-direction: column-reverse;
}

@media (hover: hover) and (pointer: fine) {
  .question-progress-fab:not(.is-compact):hover .question-progress-fab-panel,
  .question-progress-fab:not(.is-compact):focus-within .question-progress-fab-panel {
    width: min(360px, var(--fab-max-width));
    max-height: min(85dvh, var(--fab-max-height));
    border-radius: 16px;
    display: flex;
    flex-direction: column-reverse;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  }

  .question-progress-fab:not(.is-compact).is-hover-dismissed:hover .question-progress-fab-panel,
  .question-progress-fab:not(.is-compact).is-hover-dismissed:focus-within .question-progress-fab-panel {
    width: 42px;
    max-height: none;
    border-radius: 21px;
    box-shadow: none;
  }
}

.question-progress-fab-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  height: 42px;
}

.question-progress-fab-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: inherit;
}

.question-progress-fab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--bs-secondary);
  font-size: 1rem;
  flex-shrink: 0;
}

.question-progress-fab-close-inline {
  margin: -4px -4px 0 0;
}

.question-progress-fab-close:hover {
  background: var(--bs-tertiary-bg);
  color: var(--bs-body-color);
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

@media (hover: hover) and (pointer: fine) {
  .question-progress-fab:not(.is-compact):hover .question-progress-fab-body,
  .question-progress-fab:not(.is-compact):focus-within .question-progress-fab-body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: min(calc(85dvh - 42px), calc(var(--fab-max-height) - 42px));
    opacity: 1;
    padding: 14px 14px 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    pointer-events: auto;
  }

  .question-progress-fab:not(.is-compact).is-hover-dismissed:hover .question-progress-fab-body,
  .question-progress-fab:not(.is-compact).is-hover-dismissed:focus-within .question-progress-fab-body {
    max-height: 0;
    opacity: 0;
    padding: 0 14px;
    overflow: hidden;
    pointer-events: none;
  }
}

.question-progress-fab.is-compact.is-expanded .question-progress-fab-panel {
  width: var(--fab-max-width);
  max-height: min(85dvh, var(--fab-max-height));
  border-radius: 16px;
  display: flex;
  flex-direction: column-reverse;
  padding-bottom: var(--fab-safe-bottom);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
}

.question-progress-fab.is-compact.is-expanded .question-progress-fab-header {
  flex: 0 0 auto;
  justify-content: center;
}

.question-progress-fab.is-compact:not(.is-expanded) .question-progress-fab-body {
  max-height: 0;
  opacity: 0;
  padding: 0;
  pointer-events: none;
}

.question-progress-fab.is-compact .question-progress-fab-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  padding: 14px 14px 0;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.22s ease 0.08s,
    padding 0.25s ease;
}

.question-progress-fab.is-compact.is-expanded .question-progress-fab-body {
  max-height: none;
  opacity: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  pointer-events: auto;
  padding-bottom: 14px;
}

.question-progress-fab.is-compact.is-expanded .question-progress-fab-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 400px) {
  .question-progress-fab.is-compact.is-expanded .question-progress-fab-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.question-progress-fab-headline {
  margin-bottom: 10px;
}

.question-progress-fab-headline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 4px;
}

.question-progress-fab-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0;
}

.question-progress-fab-subtitle {
  font-size: clamp(0.8125rem, 2.8vw, 0.875rem);
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
  font-size: clamp(0.75rem, 2.6vw, 0.8rem);
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

.legend-dot-warning {
  background: var(--bs-warning);
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
  margin-bottom: 0;
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
  font-size: clamp(0.9375rem, 3.2vw, 1.05rem);
  font-weight: 700;
  line-height: 1.25;
}

@media (prefers-reduced-motion: reduce) {
  .question-progress-fab-panel,
  .question-progress-fab.is-compact .question-progress-fab-body {
    transition: none !important;
  }
}
</style>
