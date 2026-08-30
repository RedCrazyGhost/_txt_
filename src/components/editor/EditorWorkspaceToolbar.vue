<script setup lang="ts">
import { ref } from "vue";
import type { LocalBankDraft } from "../../services/questionJsonIo";

defineProps<{
  localBankDraft: LocalBankDraft;
  localBankMessage: string;
  isLeftStack: boolean;
  lastSavedBankId: string;
  isDraft: boolean;
  generatingQuestionSet: boolean;
  txtCount: number;
}>();

const emit = defineEmits<{
  syncDraft: [];
  toggleDistribution: [];
  importChange: [event: Event];
  importClick: [];
  practice: [];
  generate: [];
}>();

const importInputRef = ref<HTMLInputElement | null>(null);

function triggerImport() {
  importInputRef.value?.click();
  emit("importClick");
}

defineExpose({ triggerImport, importInputRef });
</script>

<template>
  <div class="editor-ide__toolbar">
    <div class="editor-ide__draft-fields">
      <input
        v-model="localBankDraft.title"
        class="form-control form-control-sm"
        placeholder="题集名称"
        aria-label="题集名称"
        @input="emit('syncDraft')"
      />
      <input
        v-model="localBankDraft.subject"
        class="form-control form-control-sm"
        placeholder="类型"
        aria-label="类型"
        @input="emit('syncDraft')"
      />
      <input
        v-model="localBankDraft.author"
        class="form-control form-control-sm"
        placeholder="作者"
        aria-label="作者"
        @input="emit('syncDraft')"
      />
    </div>
    <div class="editor-ide__actions">
      <div class="btn-group editor-ide__action-group" role="group" aria-label="题集操作">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm editor-ide__dist-btn"
          :title="isLeftStack ? '切换为左中右' : '切换为左上下'"
          :aria-label="isLeftStack ? '切换为左中右' : '切换为左上下'"
          @click="emit('toggleDistribution')"
        >
          <i
            class="fas"
            :class="isLeftStack ? 'fa-columns' : 'fa-table-list'"
            aria-hidden="true"
          ></i>
        </button>
        <input
          ref="importInputRef"
          class="d-none"
          type="file"
          accept=".json,application/json"
          multiple
          @change="emit('importChange', $event)"
        />
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm text-nowrap"
          @click="triggerImport"
        >
          <i class="fas fa-file-import me-1" aria-hidden="true"></i>导入
        </button>
        <button
          v-if="lastSavedBankId && !isDraft"
          type="button"
          class="btn btn-outline-success btn-sm text-nowrap"
          @click="emit('practice')"
        >
          <i class="fas fa-play me-1" aria-hidden="true"></i>开始做题
        </button>
      </div>
      <button
        type="button"
        class="btn btn-primary editor-ide__generate-btn text-nowrap"
        :disabled="generatingQuestionSet || !txtCount"
        @click="emit('generate')"
      >
        <i class="fas fa-file-signature me-1" aria-hidden="true"></i>生成题集
      </button>
    </div>
  </div>
  <div v-if="localBankMessage" class="alert alert-secondary py-2 mt-2 mb-0">
    {{ localBankMessage }}
  </div>
</template>
