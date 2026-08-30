<script setup lang="ts">
import { ref } from "vue";
import BankNotebookGroup from "../components/practice/BankNotebookGroup.vue";
import DeleteNotebookModal from "../components/practice/DeleteNotebookModal.vue";
import GenerateWrongNotebookModal from "../components/practice/GenerateWrongNotebookModal.vue";
import { NotebookFilter } from "../services/practiceProgress";
import { usePracticeProgressPage } from "../composables/usePracticeProgressPage";

const {
  activeFilter,
  searchKeyword,
  filterOptions,
  groups,
  notebookById,
  pendingDelete,
  pendingWrongTarget,
  isEmptyAll,
  isEmptyFiltered,
  hasActiveSearch,
  setFilter,
  applySearch,
  clearSearch,
  filterCount,
  isFilterDisabled,
  filterDisabledTitle,
  canResume,
  resume,
  requestWrong,
  cancelWrong,
  confirmWrong,
  requestDelete,
  cancelDelete,
  confirmDelete,
  exportArchiveBackup,
  importArchiveBackup
} = usePracticeProgressPage();

const backupFileInput = ref<HTMLInputElement | null>(null);

function triggerImportBackup() {
  backupFileInput.value?.click();
}

function onBackupFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  importArchiveBackup(input.files?.[0]);
  input.value = "";
}
</script>

<template>
  <div class="practice-progress-page container py-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
      <div>
        <h2 class="mb-1">练习档案</h2>
        <p class="text-muted small mb-0">
          按题库查看做题本；可从错题生成错题本继续复习。
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <input
          ref="backupFileInput"
          type="file"
          class="d-none"
          accept=".json,application/json"
          @change="onBackupFileChange"
        />
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="exportArchiveBackup">
          <i class="fas fa-download me-1" aria-hidden="true"></i>导出备份
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="triggerImportBackup">
          <i class="fas fa-upload me-1" aria-hidden="true"></i>导入备份
        </button>
        <router-link class="btn btn-outline-secondary" to="/question-bank">
          <i class="fas fa-arrow-left me-1"></i>返回题库
        </router-link>
      </div>
    </div>

    <section v-if="!isEmptyAll" class="mb-3 archive-search">
      <div class="input-group">
        <input
          v-model="searchKeyword"
          class="form-control"
          placeholder="搜索题库名、类型、作者或日期"
          aria-label="搜索练习档案"
          @keydown.enter.prevent="applySearch"
        />
        <button
          v-if="hasActiveSearch"
          class="btn btn-outline-secondary"
          type="button"
          aria-label="清空搜索"
          @click="clearSearch"
        >
          <i class="fas fa-times"></i>
        </button>
        <button class="btn btn-outline-secondary" type="button" aria-label="搜索" @click="applySearch">
          <i class="fas fa-search"></i>
        </button>
      </div>
    </section>

    <div class="archive-filters mb-4" role="group" aria-label="档案筛选">
      <button
        v-for="option in filterOptions"
        :key="option.key"
        type="button"
        class="btn btn-sm rounded-pill archive-filter-btn"
        :class="activeFilter === option.key ? 'btn-primary' : 'btn-outline-secondary'"
        :disabled="isFilterDisabled(option.key)"
        :aria-pressed="activeFilter === option.key"
        :title="filterDisabledTitle(option.key)"
        @click="setFilter(option.key)"
      >
        {{ option.label }}
        <span
          class="badge rounded-pill ms-1 archive-filter-count"
          :class="
            activeFilter === option.key ? 'text-bg-light' : 'text-bg-secondary'
          "
        >
          {{ filterCount(option.key) }}
        </span>
      </button>
    </div>

    <div v-if="isEmptyAll" class="card shadow-sm">
      <div class="card-body text-center py-5">
        <p class="mb-3">还没有练习档案，去题库开始练习吧。</p>
        <router-link class="btn btn-primary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>前往题库
        </router-link>
      </div>
    </div>

    <div v-else-if="isEmptyFiltered" class="card shadow-sm">
      <div class="card-body text-center py-4 text-secondary">
        <p class="mb-2">当前筛选下暂无记录，试试切换为「全部」或清空搜索。</p>
        <div class="d-flex flex-wrap justify-content-center gap-2">
          <button
            v-if="hasActiveSearch"
            type="button"
            class="btn btn-outline-secondary btn-sm"
            @click="clearSearch"
          >
            清空搜索
          </button>
          <button
            v-if="activeFilter !== NotebookFilter.ALL"
            type="button"
            class="btn btn-outline-primary btn-sm"
            @click="setFilter(NotebookFilter.ALL)"
          >
            查看全部
          </button>
        </div>
      </div>
    </div>

    <div v-else class="d-flex flex-column gap-4">
      <BankNotebookGroup
        v-for="group in groups"
        :key="group.groupKey"
        :group="group"
        :notebook-by-id="notebookById"
        :can-resume="canResume"
        @resume="resume"
        @wrong="requestWrong"
        @delete="requestDelete"
      />
    </div>

    <GenerateWrongNotebookModal
      :target="pendingWrongTarget"
      @cancel="cancelWrong"
      @confirm="confirmWrong"
    />

    <DeleteNotebookModal
      :notebook="pendingDelete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.archive-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.archive-filter-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.archive-filter-count {
  font-weight: 500;
}
</style>
