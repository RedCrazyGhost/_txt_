<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  formatStorageBytes,
  getBrowserStorageStats,
  getStorageUsageTone
} from "../services/browserStorage";
import { subscribeStorageChanged, unsubscribeStorageChanged } from "../services/appStorageSync";

const props = defineProps({
  compact: { type: Boolean, default: false },
  refreshToken: { type: Number, default: 0 }
});

const stats = ref(null);
const loading = ref(false);

const canRender = computed(() => typeof window !== "undefined");

const tone = computed(() => getStorageUsageTone(stats.value?.percent ?? 0));

const usageText = computed(() => {
  if (!stats.value) return "";
  return `${formatStorageBytes(stats.value.usage)} / ${formatStorageBytes(stats.value.quota)}（${stats.value.percent.toFixed(1)}%）`;
});

const noteText = computed(() => {
  if (!stats.value) return "";
  return stats.value.estimateAvailable
    ? "配额含本站全部本地存储"
    : "配额为估算值（约 5MB）";
});

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

watch(
  () => props.refreshToken,
  () => {
    loadStats();
  }
);

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
        <div class="d-flex align-items-center gap-2">
          <div class="storage-usage-panel-title fw-semibold" :class="compact ? 'small' : ''">
            浏览器存储
          </div>
          <button
            type="button"
            class="btn btn-outline-secondary"
            :class="compact ? 'btn-sm py-0 px-2' : 'btn-sm'"
            :disabled="loading"
            aria-label="刷新存储用量"
            title="刷新"
            @click="loadStats"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          </button>
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
          :style="{ width: `${stats.percent}%` }"
        ></div>
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
