<script setup lang="ts">
defineProps<{
  hasQuestions: boolean;
  canSaveProgress: boolean;
  canSaveToLocalBank: boolean;
  canRedoAll: boolean;
  canGenerateWrong: boolean;
  backToBankLabel: string;
}>();

defineEmits<{
  saveProgress: [];
  saveToLocalBank: [];
  redoAll: [];
  requestWrong: [];
}>();
</script>

<template>
  <div class="practice-page-toolbar d-flex flex-wrap align-items-center justify-content-end gap-2">
    <template v-if="hasQuestions">
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i class="fas fa-save me-1" aria-hidden="true"></i>保存
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button
              type="button"
              class="dropdown-item"
              :disabled="!canSaveProgress"
              @click="$emit('saveProgress')"
            >
              <i class="fas fa-cloud-upload-alt me-2 text-primary" aria-hidden="true"></i>
              保存进度到浏览器
            </button>
          </li>
          <li>
            <button
              type="button"
              class="dropdown-item"
              :disabled="!canSaveToLocalBank"
              @click="$emit('saveToLocalBank')"
            >
              <i class="fas fa-book me-2 text-secondary" aria-hidden="true"></i>
              保存到本地题库
            </button>
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="btn btn-outline-danger btn-sm"
        :disabled="!canGenerateWrong"
        @click="$emit('requestWrong')"
      >
        <i class="fas fa-book-open me-1" aria-hidden="true"></i>生成错题本
      </button>

      <button
        type="button"
        class="btn btn-outline-warning btn-sm"
        :disabled="!canRedoAll"
        @click="$emit('redoAll')"
      >
        <i class="fas fa-undo me-1" aria-hidden="true"></i>重做全卷
      </button>

      <span class="practice-toolbar-divider d-none d-md-inline" aria-hidden="true"></span>
    </template>

    <router-link class="btn btn-outline-secondary btn-sm" to="/practice-progress">
      <i class="fas fa-history me-1" aria-hidden="true"></i>练习档案
    </router-link>
    <router-link class="btn btn-outline-secondary btn-sm" to="/question-bank">
      <i class="fas fa-book me-1" aria-hidden="true"></i>{{ backToBankLabel }}
    </router-link>
  </div>
</template>

<style scoped>
.practice-toolbar-divider {
  align-self: stretch;
  width: 1px;
  margin: 0.15rem 0.1rem;
  background: var(--bs-border-color);
}
</style>
