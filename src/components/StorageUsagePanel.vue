<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  formatStoredQuestionCount,
  formatStorageBytes,
  getBrowserStorageStats,
  getStorageUsageTone,
  LOCAL_QUESTION_CAPACITY,
  type BrowserStorageStats
} from "../services/browserStorage";
import { subscribeStorageChanged, unsubscribeStorageChanged } from "../services/appStorageSync";

withDefaults(
  defineProps<{
    compact?: boolean;
  }>(),
  { compact: false }
);

const stats = ref<BrowserStorageStats | null>(null);
const loading = ref(false);

const canRender = computed(() => typeof window !== "undefined");

const tone = computed(() => getStorageUsageTone(stats.value?.percent ?? 0));
const questionTone = computed(() => getStorageUsageTone(stats.value?.questionPercent ?? 0));

const usageText = computed(() => {
  if (!stats.value) return "";
  return `${formatStorageBytes(stats.value.usage)} / ${formatStorageBytes(stats.value.quota)}（${stats.value.percent.toFixed(1)}%）`;
});

const questionProgressText = computed(() => {
  if (!stats.value) return "";
  const stored = formatStoredQuestionCount(stats.value.localQuestionCount);
  const capacity = formatStoredQuestionCount(stats.value.localQuestionCapacity);
  return `${stored} / ${capacity} 道（${stats.value.questionPercent.toFixed(1)}%）`;
});

const noteText = `配额约 5M，本地题库上限 ${formatStoredQuestionCount(LOCAL_QUESTION_CAPACITY)} 道（与远程缓存、进度共享空间，因浏览器而异）`;

const breakdownItems = computed(() => {
  if (!stats.value) return [];
  const { breakdown } = stats.value;
  return [
    { label: "本地题库", value: breakdown.localBanks },
    { label: "远程缓存", value: breakdown.remoteBanks },
    { label: "题集进度", value: breakdown.practiceProgress }
  ];
});

async function loadStats() {
  if (!canRender.value) return;
  loading.value = true;
  try {
    stats.value = await getBrowserStorageStats();
  } finally {
    loading.value = false;
  }
}

function handleStorageChanged() {
  loadStats();
}

onMounted(() => {
  loadStats();
  subscribeStorageChanged(handleStorageChanged);
});

onBeforeUnmount(() => {
  unsubscribeStorageChanged(handleStorageChanged);
});
</script>

<template>
  <div v-if="canRender" class="storage-usage-panel card shadow-sm" :class="{ 'storage-usage-panel-compact': compact }">
    <div class="card-body" :class="compact ? 'py-2 px-3' : 'py-3'">
      <div
        class="d-flex justify-content-between align-items-center flex-wrap gap-2"
        :class="compact ? 'mb-1' : 'mb-2'"
      >
        <div class="storage-usage-panel-title fw-semibold" :class="compact ? 'small' : ''">
          浏览器存储
        </div>
        <div v-if="stats" class="text-muted" :class="compact ? 'small' : 'small'">
          {{ usageText }}
        </div>
        <div v-else-if="loading" class="text-muted small">加载中…</div>
      </div>

      <div
        v-if="stats"
        class="progress"
        :class="compact ? 'storage-usage-panel-bar-compact' : 'storage-usage-panel-bar'"
        role="progressbar"
        :aria-valuenow="Math.round(stats.percent)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`浏览器存储已用 ${stats.percent.toFixed(1)}%`"
      >
        <div
          class="progress-bar"
          :class="`bg-${tone}`"
          :style="{ width: `${Math.min(100, stats.percent)}%` }"
        ></div>
      </div>

      <div v-if="stats" :class="compact ? 'mt-2' : 'mt-3'">
        <div
          class="d-flex justify-content-between align-items-center flex-wrap gap-2"
          :class="compact ? 'mb-1' : 'mb-2'"
        >
          <div class="text-secondary" :class="compact ? 'small' : 'small'">本地已存题目</div>
          <div class="text-muted" :class="compact ? 'small' : 'small'">
            {{ questionProgressText }}
          </div>
        </div>
        <div
          class="progress"
          :class="compact ? 'storage-usage-panel-bar-compact' : 'storage-usage-panel-bar'"
          role="progressbar"
          :aria-valuenow="Math.round(stats.questionPercent)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`本地已存题目 ${stats.questionPercent.toFixed(1)}%`"
        >
          <div
            class="progress-bar"
            :class="`bg-${questionTone}`"
            :style="{ width: `${Math.min(100, stats.questionPercent)}%` }"
          ></div>
        </div>
      </div>

      <div v-if="stats && !compact" class="row g-2 small mt-3">
        <div v-for="item in breakdownItems" :key="item.label" class="col-12 col-md-4">
          <div class="storage-usage-panel-item border rounded px-2 py-1">
            <span class="text-secondary">{{ item.label }}</span>
            <span class="float-end">{{ formatStorageBytes(item.value) }}</span>
          </div>
        </div>
      </div>

      <div v-if="stats" class="text-muted mt-2" :class="compact ? 'small mb-0' : 'small'">
        {{ noteText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-usage-panel-bar {
  height: 0.85rem;
}

.storage-usage-panel-bar-compact {
  height: 0.5rem;
}

.storage-usage-panel-compact .storage-usage-panel-title {
  font-size: 0.875rem;
}

.storage-usage-panel-item {
  background: var(--bs-tertiary-bg);
}
</style>
