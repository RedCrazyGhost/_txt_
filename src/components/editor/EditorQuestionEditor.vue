<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import { appState, type TxtEntry } from "../../state/appState";
import { txtCharNumber } from "../../utils/questions";

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
  add: [];
}>();

const explanationOpen = ref(false);
const explanationInputRef = ref<HTMLTextAreaElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);

const activeIndex = computed({
  get: () => props.modelValue,
  set: (value: number) => emit("update:modelValue", value)
});

const current = computed(() => {
  const index = activeIndex.value;
  if (index < 0 || index >= appState.txts.length) return null;
  return appState.txts[index];
});

const canDelete = computed(() => Boolean(current.value && !current.value.noDelete));

watch(
  () => activeIndex.value,
  () => {
    explanationOpen.value = Boolean(current.value?.explanation?.trim());
  },
  { immediate: true }
);

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

function boxMinHeight(txt: string): number {
  return Math.max(6, 2.5 + txtCharNumber(txt) * 1.5);
}

function getLineNumbers(txt: string): number[] {
  return Array.from({ length: txtCharNumber(txt) }, (_, index) => index + 1);
}

function md5Bg(value: TxtEntry): string {
  if (!value.MD5) return "";
  return "var(--txt-md5-locked-bg)";
}

function addTxt() {
  appState.txts.push({ MD5: false, txt: "", image: "", noDelete: false, explanation: "" });
  activeIndex.value = appState.txts.length - 1;
  emit("add");
}

function deleteTxt() {
  const index = activeIndex.value;
  const item = appState.txts[index];
  if (!item || item.noDelete) return;
  appState.txts.splice(index, 1);
  if (!appState.txts.length) {
    activeIndex.value = -1;
    return;
  }
  activeIndex.value = Math.min(index, appState.txts.length - 1);
}

function toggleNoDelete() {
  const item = current.value;
  if (!item) return;
  item.noDelete = !item.noDelete;
}

function toggleMd5() {
  const item = current.value;
  if (!item) return;
  item.MD5 = !item.MD5;
}

function triggerImagePick() {
  imageInputRef.value?.click();
}

function onImageChange(event: Event) {
  const item = current.value;
  if (!item) return;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function load(this: FileReader) {
    item.image = String(this.result ?? "");
  };
  input.value = "";
}

function deleteImage() {
  const item = current.value;
  if (!item) return;
  item.image = "";
}

async function toggleExplanation() {
  explanationOpen.value = !explanationOpen.value;
  if (explanationOpen.value) {
    await nextTick();
    explanationInputRef.value?.focus();
  }
}

function setExplanationRef(el: Element | ComponentPublicInstance | null) {
  explanationInputRef.value = el instanceof HTMLTextAreaElement ? el : null;
}

function goPrev() {
  if (activeIndex.value > 0) activeIndex.value -= 1;
}

function goNext() {
  if (activeIndex.value < appState.txts.length - 1) activeIndex.value += 1;
}
</script>

<template>
  <div class="editor-q-editor">
    <div class="editor-q-editor__scroll">
      <div v-if="!current" class="editor-q-editor__empty text-secondary">
        <p class="mb-3">还没有题目。先添加一题，或切换到 AI 生成。</p>
        <button type="button" class="btn btn-primary" @click="addTxt">
          <i class="fas fa-plus me-1" aria-hidden="true"></i>添加题目
        </button>
        <p class="small text-muted mt-3 mb-0">示例：<code>1+1=_2_</code></p>
      </div>

      <div v-else class="editor-q-editor__form">
        <div class="editor-q-editor__meta text-secondary small mb-2">
          编辑 · 题目 {{ activeIndex + 1 }} / {{ appState.txts.length }}
          <span class="ms-2">示例 <code>1+1=_2_</code></span>
        </div>

        <div v-if="current.image" class="editor-q-editor__image mb-2">
          <img class="img-fluid rounded" :src="current.image" :alt="`题目 ${activeIndex + 1} 配图`" />
        </div>

        <div class="form-floating editor-q-editor__txt-wrap">
          <div v-if="current.txt !== ''" class="editor-q-editor__gutter" aria-hidden="true">
            <span v-for="number in getLineNumbers(current.txt)" :key="`line-${number}`">
              {{ number }}
            </span>
          </div>
          <textarea
            class="form-control shadow-sm rounded editor-q-editor__textarea"
            :id="`editor-q-edit-txt-${activeIndex}`"
            :style="{
              minHeight: `${boxMinHeight(current.txt)}rem`,
              backgroundColor: md5Bg(current) || undefined
            }"
            v-model="current.txt"
            placeholder="_txt_"
          />
          <label :for="`editor-q-edit-txt-${activeIndex}`">题目内容</label>
        </div>

        <div
          class="home-explanation-slide mt-2"
          :class="{ 'home-explanation-slide--open': explanationOpen }"
        >
          <div class="home-explanation-slide__inner">
            <div class="home-explanation-panel">
              <div class="home-explanation-panel__header">
                <label
                  class="home-explanation-panel__label"
                  :for="`editor-q-edit-explanation-${activeIndex}`"
                >
                  <i class="fas fa-lightbulb" aria-hidden="true"></i>
                  解析
                </label>
              </div>
              <textarea
                :ref="setExplanationRef"
                class="form-control home-explanation-textarea"
                :id="`editor-q-edit-explanation-${activeIndex}`"
                v-model="current.explanation"
                placeholder="输入题目解析、解题思路或补充说明…"
                rows="3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-q-editor__dock">
      <input
        ref="imageInputRef"
        class="d-none"
        type="file"
        accept="image/*"
        @change="onImageChange"
      />

      <div class="editor-q-editor__dock-group">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="activeIndex <= 0"
          title="上一题"
          @click="goPrev"
        >
          <i class="fas fa-chevron-up" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="activeIndex < 0 || activeIndex >= appState.txts.length - 1"
          title="下一题"
          @click="goNext"
        >
          <i class="fas fa-chevron-down" aria-hidden="true"></i>
        </button>
      </div>

      <div class="editor-q-editor__dock-group">
        <button type="button" class="btn btn-sm btn-primary" title="添加题目" @click="addTxt">
          <i class="fas fa-plus" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-danger"
          :disabled="!canDelete"
          :title="current?.noDelete ? '已锁定，请先解锁' : '删除本题'"
          @click="deleteTxt"
        >
          <i class="fas fa-minus" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="!current"
          :title="current?.noDelete ? '已锁定，点击解锁' : '点击上锁，禁止删除'"
          @click="toggleNoDelete"
        >
          <i :class="current?.noDelete ? 'fas fa-lock' : 'fas fa-unlock'" aria-hidden="true"></i>
        </button>
      </div>

      <div class="editor-q-editor__dock-group">
        <button
          type="button"
          class="btn btn-sm btn-warning"
          :disabled="!current"
          :title="current?.MD5 ? '取消锁定高亮' : 'MD5 锁定高亮'"
          @click="toggleMd5"
        >
          <i :class="current?.MD5 ? 'fas fa-lock' : 'fas fa-unlock'" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-warning"
          :disabled="!current"
          title="上传配图"
          @click="triggerImagePick"
        >
          <i class="fas fa-camera" aria-hidden="true"></i>
        </button>
        <button
          v-if="current?.image"
          type="button"
          class="btn btn-sm btn-danger"
          title="删除配图"
          @click="deleteImage"
        >
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="explanationOpen ? 'btn-warning' : 'btn-outline-warning'"
          :disabled="!current"
          title="解析"
          @click="toggleExplanation"
        >
          <i class="fas fa-lightbulb" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-q-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: var(--bs-card-bg);
}

.editor-q-editor__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.85rem 0.85rem 0.65rem;
}

.editor-q-editor__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 10rem;
}

.editor-q-editor__txt-wrap {
  position: relative;
}

.editor-q-editor__gutter {
  position: absolute;
  left: 0.75rem;
  top: 1.6rem;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 1.5rem;
  color: var(--bs-secondary-color);
  font-size: 1rem;
  line-height: 1.5rem;
  pointer-events: none;
  user-select: none;
}

.editor-q-editor__textarea {
  padding-left: 3.2rem;
  resize: vertical;
  line-height: 1.5rem;
  font-size: 1rem;
  overflow-y: hidden;
}

.editor-q-editor__image img {
  max-height: 12rem;
  object-fit: contain;
}

.editor-q-editor__dock {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  padding: 0.5rem 0.65rem;
  border-top: 1px solid var(--bs-border-color);
  background: color-mix(in srgb, var(--bs-body-bg) 72%, var(--bs-card-bg));
  backdrop-filter: blur(8px);
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.editor-q-editor__dock-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  padding-right: 0.4rem;
  border-right: 1px solid var(--bs-border-color-translucent);
}

.editor-q-editor__dock-group:last-child {
  border-right: 0;
  padding-right: 0;
}

.home-explanation-slide {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.home-explanation-slide--open {
  grid-template-rows: 1fr;
}

.home-explanation-slide__inner {
  overflow: hidden;
}

.home-explanation-panel {
  padding: 0.65rem 0.75rem 0.8rem;
  border: 1px solid var(--home-explanation-panel-border);
  border-radius: var(--bs-border-radius);
  background: var(--home-explanation-panel-bg);
}

.home-explanation-panel__header {
  margin-bottom: 0.35rem;
}

.home-explanation-panel__label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--home-explanation-accent);
  margin: 0;
}

.home-explanation-textarea {
  background: var(--home-explanation-input-bg);
  border-color: var(--home-explanation-input-border);
  box-shadow: var(--home-explanation-input-inset-shadow);
}
</style>
