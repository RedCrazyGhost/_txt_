<script setup lang="ts">
import type { EnrichedNotebook } from "../../services/practiceProgress";
import { getTime } from "../../utils/time";

defineProps<{
  visible: boolean;
  bankName: string;
  latest: EnrichedNotebook | null;
  incompleteCount: number;
}>();

const emit = defineEmits<{
  resume: [];
  create: [];
  cancel: [];
}>();

function formatUpdatedAt(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTime(date);
}

function formatProgress(notebook: EnrichedNotebook | null) {
  if (!notebook) return "-";
  const attempted = notebook.checkpoint?.stats?.attemptedSlots ?? 0;
  const total = notebook.checkpoint?.stats?.totalSlots ?? 0;
  return `${attempted}/${total}`;
}
</script>

<template>
  <div v-if="visible" class="start-practice-modal">
    <div class="start-practice-modal-backdrop" @click="emit('cancel')"></div>
    <div class="card shadow start-practice-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="start-practice-title">
      <div class="card-body">
        <h5 id="start-practice-title" class="card-title">发现未完成做题本</h5>
        <p class="mb-2">
          《{{ bankName }}》有
          <strong>{{ incompleteCount }}</strong>
          本未完成做题本。
        </p>
        <p v-if="latest" class="text-muted small mb-3">
          最新一本更新于 {{ formatUpdatedAt(latest.updatedAt) }}，进度
          {{ formatProgress(latest) }}。
          <span v-if="incompleteCount > 1">也可稍后在练习档案中选择其他做题本。</span>
        </p>
        <div class="d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="emit('cancel')">
            取消
          </button>
          <button type="button" class="btn btn-outline-primary btn-sm" @click="emit('create')">
            新建做题本
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="emit('resume')">
            续做最新一本
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-practice-modal {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.start-practice-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.start-practice-modal-dialog {
  position: relative;
  z-index: 1;
  width: min(32rem, 100%);
}
</style>
