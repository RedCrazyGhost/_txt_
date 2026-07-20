<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { resetQuestionProgress } from "../models/question/progress";
import {
  StorageChangeKind,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "../services/appStorageSync";
import {
  ProgressFilter,
  ProgressStatus,
  applyProgressToQuestions,
  countByStatus,
  getBankSourceLabel,
  getInvalidReasonLabel,
  listProgressRecords,
  removeProgressRecord,
  type BankLike,
  type EnrichedProgressRecord,
  type ProgressFilter as ProgressFilterType
} from "../services/practiceProgress";
import { appState } from "../state/appState";
import { loadRemoteQuestionBanks, reloadRemoteBanksFromCache } from "../services/remoteQuestionBanks";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState";
import { normalizeQuestionWithDetection, numberToPercent, resolveQuestionBankVersion } from "../utils/questions";
import { getTime } from "../utils/time";
import type { Question } from "../models/question/types";

const route = useRoute();
const router = useRouter();

const activeFilter = ref<ProgressFilterType>(ProgressFilter.ALL);
const allRecords = ref<EnrichedProgressRecord[]>([]);

const filterOptions: Array<{ key: ProgressFilterType; label: string }> = [
  { key: ProgressFilter.ALL, label: "全部" },
  { key: ProgressFilter.IN_PROGRESS, label: "未完成" },
  { key: ProgressFilter.COMPLETED, label: "已完成" },
  { key: ProgressFilter.INVALID, label: "已失效" }
];

function getAllBanks() {
  return [...questionBankState.localBanks, ...questionBankState.remoteBanks];
}

function refreshRecords() {
  allRecords.value = listProgressRecords(
    { filter: ProgressFilter.ALL },
    getAllBanks() as BankLike[]
  );
}

async function syncProgressPageData() {
  reloadLocalBanks();
  await loadRemoteQuestionBanks();
  refreshRecords();
}

function handleStorageChanged(event: Event) {
  const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
  if (kind === StorageChangeKind.localBanks) {
    reloadLocalBanks();
    refreshRecords();
    return;
  }
  if (kind === StorageChangeKind.remoteBanks) {
    reloadRemoteBanksFromCache();
    refreshRecords();
    return;
  }
  if (kind === StorageChangeKind.practiceProgress) {
    refreshRecords();
  }
}

function syncFilterFromRoute() {
  const queryFilter = route.query.filter;
  const normalized = Array.isArray(queryFilter) ? queryFilter[0] : queryFilter;
  if (filterOptions.some((item) => item.key === normalized)) {
    activeFilter.value = normalized as ProgressFilterType;
    return;
  }
  activeFilter.value = ProgressFilter.ALL;
}

const statusCounts = computed(() => countByStatus(allRecords.value));

const filteredRecords = computed(() => {
  if (activeFilter.value === ProgressFilter.ALL) return allRecords.value;
  return allRecords.value.filter((record) => record.status === activeFilter.value);
});

const isEmptyAll = computed(() => allRecords.value.length === 0);
const isEmptyFiltered = computed(() => !isEmptyAll.value && filteredRecords.value.length === 0);

function setFilter(filter: ProgressFilterType) {
  activeFilter.value = filter;
  router.replace({
    path: "/practice-progress",
    query: filter === ProgressFilter.ALL ? {} : { filter }
  });
}

function formatUpdatedAt(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTime(date);
}

function formatAccuracy(record: EnrichedProgressRecord) {
  const { attemptedSlots = 0, correctSlots = 0 } = record.stats ?? {};
  if (!attemptedSlots) return "-";
  return `${numberToPercent(correctSlots, attemptedSlots).toFixed(1)}%`;
}

function statusLabel(status: string) {
  switch (status) {
    case ProgressStatus.IN_PROGRESS:
      return "未完成";
    case ProgressStatus.COMPLETED:
      return "已完成";
    case ProgressStatus.INVALID:
      return "已失效";
    case ProgressStatus.NOT_STARTED:
      return "未开始";
    default:
      return status;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case ProgressStatus.IN_PROGRESS:
      return "text-bg-warning";
    case ProgressStatus.COMPLETED:
      return "text-bg-success";
    case ProgressStatus.INVALID:
      return "text-bg-secondary";
    default:
      return "text-bg-light";
  }
}

function resumeLabel(status: string) {
  return status === ProgressStatus.COMPLETED ? "查看/再做" : "继续做题";
}

function canResume(record: EnrichedProgressRecord) {
  return record.status !== ProgressStatus.INVALID;
}

function resolveQuestions(record: EnrichedProgressRecord): Question[] | null {
  if (record.bankSource === "session") {
    return (record.questions ?? []).map((question) => normalizeQuestionWithDetection(question));
  }

  const bank = getAllBanks().find((item) => item.id === record.bankId);
  if (!bank) return null;
  const rawQuestions = Array.isArray(bank.questions) ? bank.questions : [];
  return rawQuestions.map((question) => normalizeQuestionWithDetection(question));
}

function resume(record: EnrichedProgressRecord) {
  if (!canResume(record)) return;

  const questions = resolveQuestions(record);
  if (!questions?.length) return;

  applyProgressToQuestions(questions, record);

  appState.questionsJSON = {
    bankId: record.bankId,
    bankSource: record.bankSource ?? "",
    version: resolveQuestionBankVersion(questions),
    name: record.name ?? "",
    type: record.type ?? "",
    author: record.author ?? "",
    questions
  };
  resetQuestionProgress(questions);
  router.push("/practice");
}

function confirmDelete(record: EnrichedProgressRecord) {
  const name = record.name || "未命名题集";
  const ok = window.confirm(`确定删除《${name}》的题集进度？此操作不可恢复。`);
  if (!ok) return;
  removeProgressRecord(record.bankId);
  refreshRecords();
}

watch(
  () => route.query.filter,
  () => {
    syncFilterFromRoute();
  }
);

onMounted(() => {
  syncFilterFromRoute();
  syncProgressPageData();
  subscribeStorageChanged(handleStorageChanged);
});

onActivated(() => {
  syncProgressPageData();
});

onBeforeUnmount(() => {
  unsubscribeStorageChanged(handleStorageChanged);
});
</script>

<template>
  <div class="practice-progress-page container py-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <div>
        <h2 class="mb-1">题集进度</h2>
        <p class="text-muted small mb-0">查看全部题集记录，继续未完成练习或手动删除进度。</p>
      </div>
      <router-link class="btn btn-outline-secondary" to="/question-bank">
        <i class="fas fa-arrow-left me-1"></i>返回题库
      </router-link>
    </div>

    <div class="btn-group flex-wrap mb-4" role="group" aria-label="进度筛选">
      <button
        v-for="option in filterOptions"
        :key="option.key"
        type="button"
        class="btn btn-sm"
        :class="activeFilter === option.key ? 'btn-primary' : 'btn-outline-primary'"
        @click="setFilter(option.key)"
      >
        {{ option.label }}
        <span class="ms-1">({{ statusCounts[option.key] ?? statusCounts.all }})</span>
      </button>
    </div>

    <div v-if="isEmptyAll" class="card shadow-sm">
      <div class="card-body text-center py-5">
        <p class="mb-3">还没有题集进度，去题库开始练习吧。</p>
        <router-link class="btn btn-primary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>前往题库
        </router-link>
      </div>
    </div>

    <div v-else-if="isEmptyFiltered" class="card shadow-sm">
      <div class="card-body text-center py-4 text-secondary">
        当前筛选条件下暂无记录。
      </div>
    </div>

    <div v-else class="d-flex flex-column gap-3">
      <div v-for="record in filteredRecords" :key="record.bankId" class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
            <div>
              <h5 class="card-title mb-1">{{ record.name || "未命名题集" }}</h5>
              <div class="text-muted small">
                <span class="me-2">{{ getBankSourceLabel(record.bankSource) }}</span>
                <span v-if="record.type" class="me-2">类型：{{ record.type }}</span>
                <span v-if="record.author">作者：{{ record.author }}</span>
              </div>
            </div>
            <span class="badge" :class="statusBadgeClass(record.status)">
              {{ statusLabel(record.status) }}
            </span>
          </div>

          <div class="small text-secondary mb-2">
            更新于 {{ formatUpdatedAt(record.updatedAt) }}
          </div>

          <div class="row g-2 small mb-3">
            <div class="col-6 col-md-3">
              答题空位：{{ record.stats?.attemptedSlots ?? 0 }}/{{ record.stats?.totalSlots ?? 0 }}
            </div>
            <div class="col-6 col-md-3">
              正确：{{ record.stats?.correctSlots ?? 0 }}
            </div>
            <div class="col-6 col-md-3">
              半对：{{ record.stats?.partialSlots ?? 0 }}
            </div>
            <div class="col-6 col-md-3">
              错误：{{ record.stats?.wrongSlots ?? 0 }}
            </div>
            <div class="col-6 col-md-3">
              正确率：{{ formatAccuracy(record) }}
            </div>
          </div>

          <p v-if="record.invalidReason" class="text-danger small mb-3">
            {{ getInvalidReasonLabel(record.invalidReason) }}
          </p>

          <div class="d-flex flex-wrap gap-2">
            <button
              v-if="canResume(record)"
              type="button"
              class="btn btn-primary btn-sm"
              @click="resume(record)"
            >
              <i class="fas fa-play me-1"></i>{{ resumeLabel(record.status) }}
            </button>
            <button type="button" class="btn btn-outline-danger btn-sm" @click="confirmDelete(record)">
              <i class="fas fa-trash-alt me-1"></i>删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
