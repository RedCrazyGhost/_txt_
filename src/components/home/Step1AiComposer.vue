<script setup lang="ts">
import { ref, type Ref } from "vue";
import type { ReferenceFile } from "../../services/ai/referenceFile";
import AppIcon from "../icons/AppIcon.vue";

export interface Step1AiComposerExpose {
  promptEl: Ref<HTMLTextAreaElement | null>;
}

const promptEl = ref<HTMLTextAreaElement | null>(null);

defineExpose({ promptEl } satisfies Step1AiComposerExpose);

defineProps<{
  userPrompt: string;
  loading: boolean;
  settingsOpen: boolean;
  apiKeyConfigured: boolean;
  thinkingEnabled: boolean;
  referenceFiles: ReferenceFile[];
  isDeepSeek: boolean;
  balanceText: string;
  composerError: string;
}>();

const emit = defineEmits<{
  "update:userPrompt": [value: string];
  toggleSettings: [];
  toggleThinking: [];
  triggerReferencePicker: [];
  referenceChange: [event: Event];
  removeReferenceFile: [name: string];
  generate: [];
  promptKeydown: [event: KeyboardEvent];
  autoResizePrompt: [];
  clearComposerError: [];
}>();
</script>

<template>
  <div class="step1-ai-composer-wrap">
    <div
      class="step1-ai-composer-box"
      :class="{ 'is-settings-open': settingsOpen, 'needs-key': !apiKeyConfigured }"
    >
      <div v-if="referenceFiles.length" class="step1-ai-reference-list">
        <div
          v-for="file in referenceFiles"
          :key="file.name"
          class="step1-ai-reference-chip"
        >
          <AppIcon name="file-lines" class="step1-ai-reference-chip-icon" />
          <span class="step1-ai-reference-chip-name" :title="file.name">{{ file.name }}</span>
          <button
            type="button"
            class="step1-ai-reference-chip-remove"
            :aria-label="`移除参考文件 ${file.name}`"
            :disabled="loading"
            @click="emit('removeReferenceFile', file.name)"
          >
            <AppIcon name="times" />
          </button>
        </div>
      </div>
      <textarea
        id="step1-ai-prompt"
        ref="promptEl"
        :value="userPrompt"
        class="step1-ai-composer-input"
        rows="2"
        placeholder="描述题集要求…"
        :disabled="loading"
        aria-label="AI 生成要求"
        @input="
          emit('update:userPrompt', ($event.target as HTMLTextAreaElement).value);
          emit('autoResizePrompt');
          emit('clearComposerError');
        "
        @keydown="emit('promptKeydown', $event)"
      />
      <div class="step1-ai-composer-footer">
        <div class="step1-ai-composer-tools">
          <button
            type="button"
            class="step1-ai-composer-chip step1-ai-settings-btn"
            :class="{ 'is-active': settingsOpen }"
            :aria-expanded="settingsOpen"
            aria-label="模型设置"
            :disabled="loading"
            @click="emit('toggleSettings')"
          >
            <AppIcon name="brain" />
            <span>模型</span>
            <span v-if="!apiKeyConfigured" class="step1-ai-settings-badge" aria-label="未配置 API Key"></span>
          </button>
          <button
            type="button"
            class="step1-ai-composer-chip"
            :class="{ 'is-active': thinkingEnabled }"
            :aria-pressed="thinkingEnabled"
            :disabled="loading"
            @click="emit('toggleThinking')"
          >
            <AppIcon name="atom" />
            <span>深度思考</span>
          </button>
          <button
            type="button"
            class="step1-ai-composer-chip"
            :class="{ 'is-active': referenceFiles.length > 0 }"
            aria-label="添加参考文件"
            :disabled="loading"
            @click="emit('triggerReferencePicker')"
          >
            <AppIcon name="paperclip" />
            <span>参考文件</span>
          </button>
          <slot name="reference-input" />
        </div>
        <button
          type="button"
          class="step1-ai-composer-send"
          :disabled="loading || !userPrompt.trim()"
          aria-label="发送"
          @click="emit('generate')"
        >
          <span
            v-if="loading"
            class="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <AppIcon v-else name="arrow-up" />
        </button>
      </div>
    </div>

    <slot name="settings" />

    <p v-if="isDeepSeek && balanceText && !settingsOpen" class="step1-ai-balance step1-ai-balance-outside small text-muted mb-0">
      <AppIcon name="wallet" class="step1-ai-balance-icon" />
      DeepSeek 余额：{{ balanceText }}
    </p>

    <p v-if="composerError" class="step1-ai-composer-error small text-danger mb-0" role="alert">
      {{ composerError }}
    </p>
  </div>
</template>

<style scoped>
.step1-ai-settings-btn {
  position: relative;
}

.step1-ai-settings-badge {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background-color: var(--bs-warning);
}

.step1-ai-balance {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  line-height: 1.4;
}

.step1-ai-balance-icon {
  margin-top: 0.15rem;
  opacity: 0.7;
}

.step1-ai-balance-outside {
  margin-top: 0.35rem;
  padding-left: 0.15rem;
}

.step1-ai-composer-wrap {
  padding: 0.625rem 0.75rem 0.5rem;
  background-color: var(--bs-tertiary-bg);
}

.step1-ai-composer-box {
  border: 1px solid var(--bs-border-color);
  border-radius: 1rem;
  background-color: var(--bs-body-bg);
  padding: 0.65rem 0.75rem 0.55rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.step1-ai-composer-box:focus-within {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-primary-rgb), 0.12);
}

.step1-ai-composer-box.is-settings-open {
  border-color: rgba(var(--bs-primary-rgb), 0.45);
}

.step1-ai-composer-box.needs-key:not(.is-settings-open) {
  border-color: rgba(var(--bs-warning-rgb), 0.55);
}

.step1-ai-reference-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
}

.step1-ai-reference-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background-color: var(--bs-secondary-bg);
  color: var(--bs-body-color);
  font-size: 0.75rem;
  line-height: 1.2;
}

.step1-ai-reference-chip-icon {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
}

.step1-ai-reference-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 12rem;
}

.step1-ai-reference-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--bs-secondary-color);
  font-size: 0.65rem;
  line-height: 1;
  cursor: pointer;
}

.step1-ai-reference-chip-remove:hover:not(:disabled) {
  color: var(--bs-danger);
}

.step1-ai-reference-chip-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.step1-ai-composer-input {
  width: 100%;
  min-height: 2.75rem;
  max-height: 10rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.875rem;
  line-height: 1.45;
  resize: none;
  overflow-y: auto;
}

.step1-ai-composer-input:focus {
  outline: none;
}

.step1-ai-composer-input:disabled {
  opacity: 0.7;
}

.step1-ai-composer-input::placeholder {
  color: var(--bs-secondary-color);
}

.step1-ai-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.45rem;
}

.step1-ai-composer-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.step1-ai-composer-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.35);
  border-radius: 999px;
  background: transparent;
  color: var(--bs-primary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.step1-ai-composer-chip:hover:not(:disabled) {
  background-color: rgba(var(--bs-primary-rgb), 0.06);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
}

.step1-ai-composer-chip.is-active {
  background-color: rgba(var(--bs-primary-rgb), 0.12);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
}

.step1-ai-composer-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.step1-ai-composer-send {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: var(--bs-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.step1-ai-composer-send:hover:not(:disabled) {
  opacity: 0.92;
}

.step1-ai-composer-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step1-ai-composer-error {
  margin-top: 0.35rem;
  padding: 0 0.15rem;
}
</style>
