<script setup lang="ts">
import { computed, ref } from "vue";
import {
  NotebookKind,
  ProgressStatus,
  formatNotebookChainLabel,
  getInvalidReasonLabel,
  getNotebookKindLabel,
  type EnrichedNotebook
} from "../../services/practiceProgress";
import { numberToPercent } from "../../utils/questions";
import { getTimeYYYYMMDD } from "../../utils/time";
import EmbeddedWrongNotebooks from "./EmbeddedWrongNotebooks.vue";

const props = withDefaults(
  defineProps<{
    notebook: EnrichedNotebook;
    canResume: boolean;
    canResumeChild: (notebook: EnrichedNotebook) => boolean;
    sourceChain?: EnrichedNotebook[];
    orphanRoot?: boolean;
    embedded?: boolean;
  }>(),
  {
    sourceChain: () => [],
    orphanRoot: false,
    embedded: false
  }
);

const emit = defineEmits<{
  resume: [notebook: EnrichedNotebook];
  wrong: [notebook: EnrichedNotebook];
  delete: [notebook: EnrichedNotebook];
}>();

const wrongListExpanded = ref(false);

const kindLabel = computed(() => getNotebookKindLabel(props.notebook.kind));

const canGenerateWrong = computed(
  () => props.notebook.wrongQuestionCount > 0 || props.notebook.wrongWithPartialCount > 0
);

function formatDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeYYYYMMDD(date);
}

function formatAccuracy(notebook: EnrichedNotebook) {
  const { attemptedSlots = 0, correctSlots = 0 } = notebook.checkpoint?.stats ?? {};
  if (!attemptedSlots) return "";
  return `${numberToPercent(correctSlots, attemptedSlots).toFixed(0)}%`;
}

function statusLabel(status: string) {
  switch (status) {
    case ProgressStatus.IN_PROGRESS:
      return "进行中";
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
      return "text-bg-light border";
  }
}

function resumeLabel(status: string) {
  switch (status) {
    case ProgressStatus.COMPLETED:
      return "查看";
    case ProgressStatus.NOT_STARTED:
      return "开始做题";
    default:
      return "继续";
  }
}

function chainSegmentClass(item: EnrichedNotebook) {
  return item.kind === NotebookKind.WRONG
    ? "source-chain-segment-wrong"
    : "source-chain-segment-practice";
}

const titleText = computed(() => {
  const date =
    props.notebook.kind === NotebookKind.WRONG
      ? formatDate(props.notebook.createdAt)
      : formatDate(props.notebook.updatedAt || props.notebook.createdAt);

  if (props.notebook.kind === NotebookKind.WRONG) {
    return date;
  }

  const attempted = props.notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = props.notebook.checkpoint?.stats?.totalSlots ?? 0;
  if (date && total > 0) {
    return `${date} · ${attempted}/${total}`;
  }
  return date;
});

const progressText = computed(() => {
  const attempted = props.notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = props.notebook.checkpoint?.stats?.totalSlots ?? 0;
  return `${attempted}/${total}`;
});

const attemptedSlots = computed(
  () => props.notebook.checkpoint?.stats?.attemptedSlots ?? 0
);

const totalSlots = computed(() => props.notebook.checkpoint?.stats?.totalSlots ?? 0);

const progressPercent = computed(() =>
  numberToPercent(attemptedSlots.value, totalSlots.value)
);

const accuracyText = computed(() => formatAccuracy(props.notebook));
const hasEmbeddedChildren = computed(() => props.notebook.children.length > 0);

const showWrongActions = computed(
  () => canGenerateWrong.value || hasEmbeddedChildren.value
);

const isWrongNotebook = computed(() => props.notebook.kind === NotebookKind.WRONG);

const showFullSourceChain = computed(
  () => props.orphanRoot && isWrongNotebook.value && props.sourceChain.length > 0
);

const showUnknownSource = computed(
  () => props.orphanRoot && isWrongNotebook.value && props.sourceChain.length === 0
);

function toggleWrongList() {
  wrongListExpanded.value = !wrongListExpanded.value;
}
</script>

<template>
  <div :class="embedded ? 'list-group-item notebook-record-item' : 'card shadow-sm'">
    <div :class="embedded ? 'notebook-record-body' : 'card-body'">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div class="notebook-heading flex-grow-1 min-w-0">
          <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
            <span
              class="badge notebook-kind-badge"
              :class="
                notebook.kind === NotebookKind.WRONG ? 'text-bg-dark' : 'text-bg-light border'
              "
            >
              {{ kindLabel }}
            </span>
            <span v-if="titleText" class="notebook-title">{{ titleText }}</span>
          </div>

          <div v-if="showFullSourceChain" class="notebook-source-panel">
            <div class="notebook-source-panel-label">
              <i class="fas fa-link me-1" aria-hidden="true"></i>来源链
            </div>
            <div class="notebook-source-chain">
              <template v-for="(item, index) in sourceChain" :key="item.id">
                <span
                  class="badge rounded-pill border source-chain-segment"
                  :class="chainSegmentClass(item)"
                >
                  {{ formatNotebookChainLabel(item) }}
                </span>
                <i
                  v-if="index < sourceChain.length - 1"
                  class="fas fa-long-arrow-alt-right source-chain-arrow"
                  aria-hidden="true"
                ></i>
              </template>
            </div>
          </div>

          <div v-else-if="showUnknownSource" class="notebook-source-unknown small">
            <i class="fas fa-unlink me-1" aria-hidden="true"></i>
            来源未知（父记录可能已删除）
          </div>
        </div>
        <span class="badge notebook-status-badge" :class="statusBadgeClass(notebook.status)">
          {{ statusLabel(notebook.status) }}
        </span>
      </div>

      <div class="notebook-progress mb-2">
        <div class="progress notebook-progress-bar" style="height: 0.45rem">
          <div
            v-if="progressPercent > 0"
            class="progress-bar bg-success"
            :style="{ width: `${progressPercent}%` }"
            role="progressbar"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`进度 ${progressText}`"
          ></div>
          <div
            v-else
            class="progress-bar bg-secondary bg-opacity-25 w-100"
            role="progressbar"
            aria-valuenow="0"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="尚未开始"
          ></div>
        </div>
      </div>

      <div class="notebook-stats-row d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div class="notebook-stats small text-secondary">
          <span>进度 {{ progressText }}</span>
          <span v-if="accuracyText">正确率 {{ accuracyText }}</span>
          <span v-if="notebook.wrongQuestionCount > 0" class="text-danger">
            错题 {{ notebook.wrongQuestionCount }}
          </span>
        </div>

        <div class="notebook-actions d-flex flex-wrap align-items-center justify-content-end gap-2">
          <button
            v-if="canResume"
            type="button"
            class="btn btn-primary btn-sm notebook-action-primary"
            @click="$emit('resume', notebook)"
          >
            <i class="fas fa-play me-1"></i>{{ resumeLabel(notebook.status) }}
          </button>
          <div v-if="showWrongActions" class="btn-group btn-group-sm wrong-actions-group" role="group">
            <button
              v-if="canGenerateWrong"
              type="button"
              class="btn btn-outline-danger"
              @click="emit('wrong', notebook)"
            >
              <i class="fas fa-book-open me-1" aria-hidden="true"></i>生成错题本
            </button>
            <button
              v-if="hasEmbeddedChildren"
              type="button"
              class="btn btn-outline-danger wrong-actions-toggle"
              :aria-expanded="wrongListExpanded"
              :aria-label="
                wrongListExpanded
                  ? `收起错题本列表（${notebook.children.length}）`
                  : `展开错题本列表（${notebook.children.length}）`
              "
              @click="toggleWrongList"
            >
              <i
                class="fas"
                :class="wrongListExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                aria-hidden="true"
              ></i>
            </button>
          </div>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm notebook-action-icon"
            :aria-label="`删除${kindLabel}`"
            @click="$emit('delete', notebook)"
          >
            <i class="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <p
        v-if="notebook.checkpoint?.invalidReason || notebook.status === ProgressStatus.INVALID"
        class="text-danger small mb-2"
      >
        {{ getInvalidReasonLabel(notebook.checkpoint?.invalidReason) }}
      </p>

      <EmbeddedWrongNotebooks
        v-if="hasEmbeddedChildren && wrongListExpanded"
        :children="notebook.children"
        :can-resume="canResumeChild"
        @resume="$emit('resume', $event)"
        @wrong="(child) => emit('wrong', child)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.notebook-record-item {
  border-left: none;
  border-right: none;
}

.notebook-stats-row {
  gap: 0.5rem 0.75rem;
}

.notebook-title {
  font-weight: 600;
  font-size: 1rem;
}

.notebook-kind-badge {
  font-weight: 600;
}

.notebook-status-badge {
  flex-shrink: 0;
}

.notebook-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.notebook-progress-bar {
  background-color: var(--bs-secondary-bg);
}

.notebook-actions {
  flex-shrink: 0;
}

.wrong-actions-group .btn {
  white-space: nowrap;
}

.wrong-actions-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  padding-left: 0;
  padding-right: 0;
  line-height: 1;
}

.wrong-actions-toggle .fas {
  display: block;
  line-height: 1;
}

.notebook-action-icon {
  width: 2rem;
  padding-left: 0;
  padding-right: 0;
}

.notebook-source-panel {
  margin-top: 0.35rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.45rem;
  border: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
}

.notebook-source-panel-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--bs-secondary-color);
  margin-bottom: 0.35rem;
}

.notebook-source-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.4rem;
  line-height: 1.45;
}

.source-chain-segment {
  font-weight: 500;
  font-size: 0.78rem;
  max-width: 100%;
  white-space: normal;
  text-align: left;
}

.source-chain-segment-practice {
  background: color-mix(in srgb, var(--bs-primary) 10%, var(--bs-body-bg));
  border-color: color-mix(in srgb, var(--bs-primary) 22%, var(--bs-border-color));
  color: var(--bs-body-color);
}

.source-chain-segment-wrong {
  background: color-mix(in srgb, var(--bs-dark) 8%, var(--bs-body-bg));
  border-color: color-mix(in srgb, var(--bs-dark) 18%, var(--bs-border-color));
  color: var(--bs-body-color);
}

.source-chain-arrow {
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  opacity: 0.8;
}

.notebook-source-unknown {
  color: var(--bs-secondary-color);
  margin-top: 0.15rem;
}

@media (max-width: 576px) {
  .notebook-stats-row {
    flex-direction: column;
    align-items: stretch;
  }

  .notebook-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .notebook-action-primary {
    flex: 1 1 auto;
  }

  .notebook-source-panel {
    padding: 0.4rem 0.55rem;
  }
}
</style>
