<script setup lang="ts">
import {
  ProgressStatus,
  getInvalidReasonLabel,
  type EnrichedNotebook
} from "../../services/practiceProgress";
import { numberToPercent } from "../../utils/questions";
import { getTimeYYYYMMDD } from "../../utils/time";

const props = withDefaults(
  defineProps<{
    children: EnrichedNotebook[];
    canResume: (notebook: EnrichedNotebook) => boolean;
    nested?: boolean;
  }>(),
  {
    nested: false
  }
);

const emit = defineEmits<{
  resume: [notebook: EnrichedNotebook];
  wrong: [notebook: EnrichedNotebook];
  delete: [notebook: EnrichedNotebook];
}>();

function canGenerateWrong(notebook: EnrichedNotebook) {
  return notebook.wrongQuestionCount > 0 || notebook.wrongWithPartialCount > 0;
}

function formatDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeYYYYMMDD(date);
}

function progressText(notebook: EnrichedNotebook) {
  const attempted = notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = notebook.checkpoint?.stats?.totalSlots ?? 0;
  return `${attempted}/${total}`;
}

function progressPercent(notebook: EnrichedNotebook) {
  const attempted = notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = notebook.checkpoint?.stats?.totalSlots ?? 0;
  return numberToPercent(attempted, total);
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
      return "开始";
    default:
      return "继续";
  }
}
</script>

<template>
  <section
    class="embedded-wrong-section"
    :class="{ 'embedded-wrong-section-nested': nested }"
    :aria-label="nested ? '衍生错题本' : '错题本'"
  >
    <div
      v-for="child in children"
      :key="child.id"
      class="embedded-wrong-row"
    >
      <div class="embedded-wrong-row-main">
        <div class="embedded-wrong-meta">
          <span class="embedded-wrong-date">{{ formatDate(child.createdAt) }}</span>
          <span class="badge embedded-wrong-status" :class="statusBadgeClass(child.status)">
            {{ statusLabel(child.status) }}
          </span>
          <span class="embedded-wrong-progress small text-secondary">
            进度 {{ progressText(child) }}
          </span>
        </div>

        <div class="embedded-wrong-actions">
          <button
            v-if="canResume(child)"
            type="button"
            class="btn btn-primary btn-sm"
            @click="$emit('resume', child)"
          >
            <i class="fas fa-play me-1" aria-hidden="true"></i>{{ resumeLabel(child.status) }}
          </button>
          <button
            v-if="canGenerateWrong(child)"
            type="button"
            class="btn btn-outline-danger btn-sm"
            aria-label="生成错题本"
            @click="emit('wrong', child)"
          >
            <i class="fas fa-book-open" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm notebook-action-icon"
            aria-label="删除错题本"
            @click="$emit('delete', child)"
          >
            <i class="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div
        v-if="progressPercent(child) > 0 || (child.checkpoint?.stats?.totalSlots ?? 0) > 1"
        class="progress embedded-wrong-progress-bar"
        style="height: 0.35rem"
      >
        <div
          class="progress-bar bg-success"
          :style="{ width: `${progressPercent(child)}%` }"
          role="progressbar"
          :aria-valuenow="progressPercent(child)"
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>

      <p
        v-if="child.checkpoint?.invalidReason || child.status === ProgressStatus.INVALID"
        class="text-danger small mb-0 mt-1"
      >
        {{ getInvalidReasonLabel(child.checkpoint?.invalidReason) }}
      </p>

      <EmbeddedWrongNotebooks
        v-if="child.children.length"
        :children="child.children"
        :can-resume="canResume"
        nested
        @resume="$emit('resume', $event)"
        @wrong="(nb) => emit('wrong', nb)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.embedded-wrong-section {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--bs-border-color);
}

.embedded-wrong-section-nested {
  margin-top: 0.55rem;
  padding-top: 0;
  padding-left: 0.75rem;
  border-top: none;
  border-left: 2px solid color-mix(in srgb, var(--bs-secondary) 35%, var(--bs-border-color));
}

.embedded-wrong-row + .embedded-wrong-row {
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid color-mix(in srgb, var(--bs-border-color) 80%, transparent);
}

.embedded-wrong-row-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
}

.embedded-wrong-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.65rem;
  min-width: 0;
}

.embedded-wrong-date {
  font-weight: 600;
  font-size: 0.92rem;
}

.embedded-wrong-status {
  font-size: 0.72rem;
}

.embedded-wrong-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.notebook-action-icon {
  width: 2rem;
  padding-left: 0;
  padding-right: 0;
}

.embedded-wrong-progress-bar {
  margin-top: 0.4rem;
  background-color: var(--bs-secondary-bg);
}

@media (max-width: 576px) {
  .embedded-wrong-actions {
    width: 100%;
  }

  .embedded-wrong-actions .btn-primary {
    flex: 1 1 auto;
  }
}
</style>
