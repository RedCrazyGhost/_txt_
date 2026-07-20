<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import FileSaver from "file-saver";
import QuestionBankList from "../components/question-bank/QuestionBankList.vue";
import QuestionBankCreatePanel from "../components/question-bank/QuestionBankCreatePanel.vue";
import {
  addBankFromExisting,
  exportBankAsJson,
  updateBankMeta,
  type Bank
} from "../services/questionBank";
import { loadRemoteQuestionBanks } from "../services/remoteQuestionBanks";
import {
  StorageChangeKind,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "../services/appStorageSync";
import {
  reloadLocalBanks,
  questionBankState,
  removeLocal,
  type QuestionBankRecord
} from "../state/questionBankState";
import { startPracticeFromBank } from "../services/practiceSession";

type BankListItem = QuestionBankRecord & {
  groupKey?: string;
  groupLabel?: string;
  CreateTime?: string;
  createTime?: string;
  name?: string;
  type?: string;
};

interface LocalEditState {
  id: string;
  title: string;
  subject: string;
  author: string;
}

interface SharedSearchState {
  quickKeyword: string;
}

type StatusVariant = "secondary" | "danger" | "success" | "warning";

const router = useRouter();

const showEditContentPanel = ref(false);
const editingContentBank = ref<QuestionBankRecord | null>(null);

const localEditState = ref<LocalEditState>({
  id: "",
  title: "",
  subject: "",
  author: ""
});

const sharedSearch = ref<SharedSearchState>({
  quickKeyword: ""
});

const remoteExpandedState = ref<Record<string, boolean>>({});
let statusMessageTimer: ReturnType<typeof setTimeout> | null = null;

const statusMessageVariant = ref<StatusVariant>("secondary");

function setStatusMessage(message: string, variant: StatusVariant = "secondary") {
  questionBankState.statusMessage = message;
  statusMessageVariant.value = variant;
  if (statusMessageTimer) {
    clearTimeout(statusMessageTimer);
  }
  statusMessageTimer = setTimeout(() => {
    questionBankState.statusMessage = "";
    statusMessageVariant.value = "secondary";
    statusMessageTimer = null;
  }, 5000);
}

function openEditContent(id: string) {
  const target = questionBankState.localBanks.find((item) => item.id === id);
  if (!target) return;
  editingContentBank.value = target;
  showEditContentPanel.value = true;
}

function closeEditContentPanel() {
  showEditContentPanel.value = false;
  editingContentBank.value = null;
}

function handleEditContentSaved(bankId: string) {
  reloadLocalBanks();
  setStatusMessage("题集内容已更新", "success");
  const updated = questionBankState.localBanks.find((item) => item.id === bankId);
  if (updated) editingContentBank.value = updated;
}

function handleEditContentPractice(bankId: string) {
  startPractice(bankId);
}

function exportBank(source: "local" | "remote", id: string) {
  const list = source === "local" ? questionBankState.localBanks : questionBankState.remoteBanks;
  const target = list.find((item) => item.id === id);
  if (!target) return;
  const blob = new Blob([exportBankAsJson(target as Bank)], { type: "application/json;charset=utf-8" });
  FileSaver.saveAs(blob, `${target.title || "question-bank"}.json`);
}

function startEditLocalBank(id: string) {
  const target = questionBankState.localBanks.find((item) => item.id === id);
  if (!target) return;
  localEditState.value = {
    id: target.id,
    title: target.title || "",
    subject: target.subject || "",
    author: target.author || ""
  };
}

function cancelEditLocalBank() {
  localEditState.value = {
    id: "",
    title: "",
    subject: "",
    author: ""
  };
}

function saveEditLocalBank() {
  const target = questionBankState.localBanks.find((item) => item.id === localEditState.value.id);
  if (!target) return;
  const result = updateBankMeta("local", target.id, {
    title: localEditState.value.title,
    subject: localEditState.value.subject,
    author: localEditState.value.author
  });
  if (!result.ok) {
    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
    setStatusMessage(result.message, "danger");
    return;
  }
  questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
  setStatusMessage(`已更新题集《${localEditState.value.title || "未命名题库"}》`);
  cancelEditLocalBank();
}

function handleRemoveLocal(id: string) {
  const result = removeLocal(id);
  if (!result.ok) {
    setStatusMessage(result.message, "danger");
  }
}

function getFieldValue(item: BankListItem, field: "name" | "type" | "author") {
  if (field === "name") return item.title || "";
  if (field === "type") return item.subject || "";
  return item.author || "";
}

function itemMatches(item: BankListItem, searchState: SharedSearchState) {
  const quickKeyword = searchState.quickKeyword.trim().toLowerCase();
  if (!quickKeyword) return true;
  return (["name", "type", "author"] as const).some((field) =>
    getFieldValue(item, field).toLowerCase().includes(quickKeyword)
  );
}

function getBankTimeValue(item: BankListItem) {
  const raw = item?.CreateTime || item?.createTime || item?.updatedAt || "";
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortBanksByCreatedAtDesc(list: BankListItem[]) {
  return [...list].sort((a, b) => getBankTimeValue(b) - getBankTimeValue(a));
}

const filteredLocalBanks = computed(() =>
  sortBanksByCreatedAtDesc(
    questionBankState.localBanks.filter((item) => itemMatches(item, sharedSearch.value))
  )
);
const filteredRemoteBanks = computed(() =>
  sortBanksByCreatedAtDesc(
    questionBankState.remoteBanks.filter((item) => itemMatches(item, sharedSearch.value))
  )
);
const filteredRemoteGroups = computed(() => {
  const grouped = new Map<string, BankListItem[]>();
  filteredRemoteBanks.value.forEach((item) => {
    const group = item.groupKey || "other";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(item);
  });
  return Array.from(grouped.entries()).map(([groupKey, banks]) => ({
    groupKey,
    label: banks[0]?.groupLabel || groupKey,
    banks
  }));
});
const remoteGroupTotalMap = computed(() => {
  const map = new Map();
  questionBankState.remoteBanks.forEach((item) => {
    const group = item.groupKey || "other";
    map.set(group, (map.get(group) || 0) + 1);
  });
  return map;
});

function applySearch() {
  sharedSearch.value.quickKeyword = sharedSearch.value.quickKeyword.trimStart();
}

function isRemoteGroupOpen(groupKey: string) {
  return Boolean(remoteExpandedState.value[groupKey]);
}

function toggleRemoteGroup(groupKey: string) {
  remoteExpandedState.value[groupKey] = !remoteExpandedState.value[groupKey];
}

function startPractice(id: string) {
  const allBanks = [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  const target = allBanks.find((item) => item.id === id);
  if (!target) return;
  startPracticeFromBank(target, router);
}

function downloadRemoteToLocal(id: string) {
  const target = questionBankState.remoteBanks.find((item) => item.id === id);
  if (!target) return;
  const result = addBankFromExisting("local", target as Bank);
  if (!result.ok) {
    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
    setStatusMessage(result.message, "danger");
    return;
  }
  questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
  setStatusMessage(`已将网络题库《${target.title || "未命名"}》下载到本地`);
}

async function loadRemotePapers() {
  await loadRemoteQuestionBanks({ force: true });
}

function syncQuestionBankPageData() {
  reloadLocalBanks();
}

function handleStorageChanged(event: Event) {
  if ((event as CustomEvent<{ kind?: string }>).detail?.kind === StorageChangeKind.localBanks) {
    syncQuestionBankPageData();
  }
}

onMounted(() => {
  syncQuestionBankPageData();
  loadRemotePapers();
  subscribeStorageChanged(handleStorageChanged);
});

onActivated(() => {
  syncQuestionBankPageData();
  if (!questionBankState.remoteBanks.length) {
    loadRemotePapers();
  }
});

onBeforeUnmount(() => {
  unsubscribeStorageChanged(handleStorageChanged);
  if (statusMessageTimer) {
    clearTimeout(statusMessageTimer);
    statusMessageTimer = null;
  }
});
</script>

<template>
  <div class="question-bank-page container py-4">
    <div class="mb-3">
      <h2 class="mb-1">题库</h2>
      <p class="text-muted small mb-0">
        管理本地与网络题集。新题集请在首页录入后保存到本地；网络题集可直接开练，编辑内容需先下载到本地。
      </p>
    </div>

    <div
      v-if="questionBankState.statusMessage"
      :class="['alert', `alert-${statusMessageVariant}`, 'py-2']"
    >
      {{ questionBankState.statusMessage }}
    </div>

    <QuestionBankCreatePanel
      v-if="showEditContentPanel && editingContentBank"
      :editing-bank="editingContentBank"
      @close="closeEditContentPanel"
      @saved="handleEditContentSaved"
      @practice="handleEditContentPractice"
    />

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
        <div v-if="localEditState.id" class="card shadow-sm mb-3">
          <div class="card-header">编辑题集信息</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-12 col-md-4">
                <label class="form-label">名称</label>
                <input v-model="localEditState.title" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">类型</label>
                <input v-model="localEditState.subject" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">作者</label>
                <input v-model="localEditState.author" class="form-control" />
              </div>
            </div>
          </div>
          <div class="card-footer d-flex gap-2">
            <button class="btn btn-primary btn-sm" @click="saveEditLocalBank">保存修改</button>
            <button class="btn btn-outline-secondary btn-sm" @click="cancelEditLocalBank">取消</button>
          </div>
        </div>

        <QuestionBankList
          title="本地题库"
          :banks="filteredLocalBanks"
          :total-count="questionBankState.localBanks.length"
          :show-edit="true"
          :show-edit-content="true"
          :show-practice="true"
          :show-upload="false"
          @edit="startEditLocalBank"
          @edit-content="openEditContent"
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
