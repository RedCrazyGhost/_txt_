<script setup lang="ts">
import { RouterLink } from "vue-router";
import { computed, ref } from "vue";
import QuestionBankList from "../components/question-bank/QuestionBankList.vue";
import StartPracticeChoiceModal from "../components/practice/StartPracticeChoiceModal.vue";
import { isDraftBank } from "../services/questionBank";
import { questionBankState } from "../state/questionBankState";
import { useQuestionBankPage } from "../composables/useQuestionBankPage";

const {
  sharedSearch,
  statusMessageVariant,
  filteredLocalBanks,
  filteredLocalDraftBanks,
  filteredRemoteGroups,
  remoteGroupTotalMap,
  openEditInEditor,
  exportBank,
  handleRemoveLocal,
  importLocalBanksFromFile,
  applySearch,
  isRemoteGroupOpen,
  toggleRemoteGroup,
  startPractice,
  downloadRemoteToLocal,
  startPracticeModalVisible,
  startPracticeBank,
  startPracticeLatest,
  startPracticeIncompleteCount,
  confirmResumePractice,
  confirmCreatePractice,
  cancelStartPractice
} = useQuestionBankPage();

const importFileInput = ref<HTMLInputElement | null>(null);

const localDraftTotal = computed(
  () => questionBankState.localBanks.filter((item) => isDraftBank(item)).length
);
const localPublishedTotal = computed(
  () => questionBankState.localBanks.filter((item) => !isDraftBank(item)).length
);

function triggerImport() {
  importFileInput.value?.click();
}

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  importLocalBanksFromFile(file);
  input.value = "";
}
</script>

<template>
  <div class="question-bank-page container py-4">
    <div class="mb-3 d-flex flex-wrap justify-content-between align-items-start gap-2">
      <div>
        <h2 class="mb-1">题库</h2>
        <p class="text-muted small mb-0">
          管理本地与网络题集。编辑中的未完成题集会自动保存为草稿；发布请在工作台点击「保存/导出」。
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <input
          ref="importFileInput"
          type="file"
          class="d-none"
          accept=".json,application/json"
          @change="onImportFileChange"
        />
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="triggerImport">
          <i class="fas fa-file-import me-1" aria-hidden="true"></i>导入
        </button>
        <RouterLink class="btn btn-primary btn-sm" to="/editor">
          <i class="fas fa-pen me-1" aria-hidden="true"></i>题集编辑
        </RouterLink>
      </div>
    </div>

    <div
      v-if="questionBankState.statusMessage"
      :class="['alert', `alert-${statusMessageVariant}`, 'py-2']"
    >
      {{ questionBankState.statusMessage }}
    </div>

    <section class="mb-3 question-bank-search">
      <div class="row g-2">
        <div class="col-12">
          <div class="input-group">
            <input
              v-model="sharedSearch.quickKeyword"
              class="form-control"
              placeholder="输入关键词，按 name/type/author 文本匹配远端与本地题库"
              @keydown.enter.prevent="applySearch"
            />
            <button class="btn btn-outline-secondary" type="button" aria-label="搜索" @click="applySearch">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="row g-3">
      <div class="col-12">
        <QuestionBankList
          v-if="localDraftTotal > 0 || filteredLocalDraftBanks.length"
          class="mb-3"
          title="题集草稿"
          :banks="filteredLocalDraftBanks"
          :total-count="localDraftTotal"
          :show-edit="true"
          edit-label="继续编辑"
          :show-practice="false"
          :show-remove="true"
          :show-export="false"
          :show-upload="false"
          @edit="openEditInEditor"
          @remove="handleRemoveLocal"
        />

        <QuestionBankList
          title="本地题库"
          :banks="filteredLocalBanks"
          :total-count="localPublishedTotal"
          :show-edit="true"
          :show-practice="true"
          :show-remove="true"
          :show-export="true"
          :show-upload="false"
          @edit="openEditInEditor"
          @remove="handleRemoveLocal"
          @export="exportBank('local', $event)"
          @practice="startPractice"
        />
      </div>

      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header">网络题库</div>
          <div class="card-body d-flex flex-column gap-3">
            <p class="small text-muted mb-0">未下载也可直接「开始做题」；若要编辑内容，请先下载到本地。</p>
            <div
              v-for="group in filteredRemoteGroups"
              :key="group.groupKey"
              class="remote-tree-node border rounded"
            >
              <button
                class="btn btn-link remote-tree-toggle text-decoration-none w-100 d-flex justify-content-between align-items-center"
                type="button"
                @click="toggleRemoteGroup(group.groupKey)"
              >
                <span>目录 / {{ group.label }}</span>
                <span class="small text-muted">
                  {{ isRemoteGroupOpen(group.groupKey) ? "收起" : "展开" }}（{{ group.banks.length }}/{{ remoteGroupTotalMap.get(group.groupKey) || 0 }}）
                </span>
              </button>
              <div v-if="isRemoteGroupOpen(group.groupKey)" class="px-2 pb-2">
                <QuestionBankList
                  :title="`题集列表 / ${group.label}`"
                  :embedded="true"
                  :banks="group.banks"
                  :total-count="remoteGroupTotalMap.get(group.groupKey)"
                  :show-edit="false"
                  :show-practice="true"
                  :show-remove="false"
                  :show-export="false"
                  :show-upload="false"
                  :show-download="true"
                  @download="downloadRemoteToLocal"
                  @practice="startPractice"
                />
              </div>
            </div>
            <div v-if="!filteredRemoteGroups.length" class="text-muted small">暂无题库数据</div>
          </div>
        </div>
      </div>
    </section>

    <StartPracticeChoiceModal
      :visible="startPracticeModalVisible"
      :bank-name="startPracticeBank?.title || startPracticeBank?.name || '未命名题集'"
      :latest="startPracticeLatest"
      :incomplete-count="startPracticeIncompleteCount"
      @resume="confirmResumePractice"
      @create="confirmCreatePractice"
      @cancel="cancelStartPractice"
    />
  </div>
</template>

<style scoped>
.question-bank-page {
  padding-bottom: 1rem;
}

.question-bank-search {
  padding: 0.25rem 0;
}

.remote-tree-node {
  border-color: var(--bs-border-color-translucent) !important;
}

.remote-tree-toggle {
  color: inherit;
  text-align: left;
  padding: 0.5rem 0.75rem;
}
</style>
