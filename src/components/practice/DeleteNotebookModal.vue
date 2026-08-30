<script setup lang="ts">
import { computed } from "vue";
import {
  NotebookKind,
  getNotebookKindLabel,
  type EnrichedNotebook
} from "../../services/practiceProgress";
import { getTimeYYYYMMDD } from "../../utils/time";

const props = defineProps<{
  notebook: EnrichedNotebook | null;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const visible = computed(() => props.notebook !== null);

const kindLabel = computed(() =>
  props.notebook ? getNotebookKindLabel(props.notebook.kind) : ""
);

const bankName = computed(() => props.notebook?.name || "未命名题集");

const dateText = computed(() => {
  if (!props.notebook) return "";
  const raw = props.notebook.updatedAt || props.notebook.createdAt;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return getTimeYYYYMMDD(date);
});

const progressText = computed(() => {
  if (!props.notebook) return "";
  const attempted = props.notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = props.notebook.checkpoint?.stats?.totalSlots ?? 0;
  return `${attempted}/${total}`;
});

const isWrongNotebook = computed(
  () => props.notebook?.kind === NotebookKind.WRONG
);
</script>

<template>
  <div v-if="visible" class="delete-notebook-modal">
    <div class="delete-notebook-modal-backdrop" @click="emit('cancel')"></div>
    <div
      class="card shadow delete-notebook-modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-notebook-title"
    >
      <div class="card-body">
        <h5 id="delete-notebook-title" class="card-title">删除{{ kindLabel }}</h5>
        <p class="mb-2">
          确定删除《<strong>{{ bankName }}</strong>》这本{{ kindLabel }}吗？
        </p>
        <ul class="text-muted small mb-3 delete-notebook-details">
          <li v-if="dateText">记录日期：{{ dateText }}</li>
          <li v-if="isWrongNotebook">类型：错题本</li>
          <li>当前进度：{{ progressText }}</li>
        </ul>
        <p class="text-danger small mb-3">
          此操作不可恢复，不会删除同题库下其他记录。
        </p>
        <div class="d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="emit('cancel')">
            取消
          </button>
          <button type="button" class="btn btn-danger btn-sm" @click="emit('confirm')">
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delete-notebook-modal {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.delete-notebook-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.delete-notebook-modal-dialog {
  position: relative;
  z-index: 1;
  width: min(32rem, 100%);
}

.delete-notebook-details {
  padding-left: 1.25rem;
  margin-bottom: 0;
}
</style>
