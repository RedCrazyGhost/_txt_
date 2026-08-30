<script setup lang="ts">
import { computed, watch } from "vue";
import { appState } from "../../state/appState";

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const activeIndex = computed({
  get: () => props.modelValue,
  set: (value: number) => emit("update:modelValue", value)
});

const current = computed(() => {
  const index = activeIndex.value;
  if (index < 0 || index >= appState.txts.length) return null;
  return appState.txts[index];
});

watch(
  () => appState.txts.length,
  (len) => {
    if (len === 0) {
      activeIndex.value = -1;
      return;
    }
    if (activeIndex.value < 0) activeIndex.value = 0;
    if (activeIndex.value >= len) activeIndex.value = len - 1;
  }
);
</script>

<template>
  <div class="editor-q-preview">
    <div v-if="!current" class="editor-q-preview__empty text-secondary">
      <p class="mb-2">还没有选中的题目。</p>
      <p class="small text-muted mb-0">在左侧列表选择，或在右侧「编辑 / AI」中添加。</p>
      <p class="small text-muted mt-2 mb-0">示例：<code>1+1=_2_</code></p>
    </div>

    <div v-else class="editor-q-preview__body">
      <div class="editor-q-preview__meta text-secondary small mb-2">
        已选中 · 题目 {{ activeIndex + 1 }} / {{ appState.txts.length }}
        <span v-if="current.MD5" class="badge text-bg-secondary ms-2">MD5</span>
        <span v-if="current.noDelete" class="badge text-bg-warning ms-1">锁定</span>
      </div>

      <div v-if="current.image" class="editor-q-preview__image mb-3">
        <img class="img-fluid rounded" :src="current.image" :alt="`题目 ${activeIndex + 1} 配图`" />
      </div>

      <div class="editor-q-preview__card">
        <pre class="editor-q-preview__txt mb-0">{{ current.txt.trim() || "（空白题目）" }}</pre>
      </div>

      <div v-if="current.explanation?.trim()" class="editor-q-preview__explanation mt-3">
        <div class="editor-q-preview__explanation-label">
          <i class="fas fa-lightbulb me-1" aria-hidden="true"></i>解析
        </div>
        <p class="mb-0">{{ current.explanation }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-q-preview {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  background: var(--bs-card-bg);
}

.editor-q-preview__empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 12rem;
}

.editor-q-preview__card {
  padding: 1rem 1.1rem;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--editor-radius, 0.65rem);
  background: var(--bs-body-bg);
}

.editor-q-preview__txt {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--bs-body-color);
}

.editor-q-preview__image img {
  max-height: 16rem;
  object-fit: contain;
}

.editor-q-preview__explanation {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--home-explanation-panel-border);
  border-radius: var(--bs-border-radius);
  background: var(--home-explanation-panel-bg);
  color: var(--bs-body-color);
}

.editor-q-preview__explanation-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--home-explanation-accent);
  margin-bottom: 0.35rem;
}
</style>
