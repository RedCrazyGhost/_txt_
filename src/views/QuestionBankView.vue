<script setup>
import { computed, onActivated, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import FileSaver from "file-saver";
import QuestionBankList from "../components/question-bank/QuestionBankList.vue";
import { addBankFromExisting, exportBankAsJson, updateBank } from "../services/questionBank";
import { loadRemoteQuestionBanks } from "../services/remoteQuestionBanks";
import { StorageChangeKind, subscribeStorageChanged, unsubscribeStorageChanged } from "../services/appStorageSync";
import { appState } from "../state/appState";
import { reloadLocalBanks, questionBankState, removeLocal } from "../state/questionBankState";
import { resetQuestionProgress } from "../models/question/progress";
import { applyProgressToQuestions, getProgressRecord } from "../services/practiceProgress";
import { normalizeQuestionWithDetection, resolveQuestionBankVersion } from "../utils/questions";
import StorageUsagePanel from "../components/StorageUsagePanel.vue";

const localEditState = ref({
  id: "",
  title: "",
  subject: "",
  author: ""
});

const sharedSearch = ref({
  quickKeyword: ""
});

const remoteExpandedState = ref({});
const storageRefreshToken = ref(0);
const router = useRouter();
let statusMessageTimer = null;

function bumpStorageRefresh() {
  storageRefreshToken.value += 1;
}

function setStatusMessage(message) {
  questionBankState.statusMessage = message;
  if (statusMessageTimer) {
    clearTimeout(statusMessageTimer);
  }
  statusMessageTimer = setTimeout(() => {
    questionBankState.statusMessage = "";
    statusMessageTimer = null;
  }, 5000);
}

function exportBank(source, id) {
  const list = source === "local" ? questionBankState.localBanks : questionBankState.remoteBanks;
  const target = list.find((item) => item.id === id);
  if (!target) return;
  const blob = new Blob([exportBankAsJson(target)], { type: "application/json;charset=utf-8" });
  FileSaver.saveAs(blob, `${target.title || "question-bank"}.json`);
}

function startEditLocalBank(id) {
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
  questionBankState.localBanks = updateBank("local", target.id, {
    title: localEditState.value.title,
    subject: localEditState.value.subject,
    author: localEditState.value.author,
    questionsText: (target.questions || []).map((q) => (Array.isArray(q) ? q.join(",") : String(q))).join("\n")
  });
  setStatusMessage(`已更新题集《${localEditState.value.title || "未命名题库"}》`);
  cancelEditLocalBank();
  bumpStorageRefresh();
}

function handleRemoveLocal(id) {
  removeLocal(id);
  bumpStorageRefresh();
}

function getFieldValue(item, field) {
  if (field === "name") return item.title || "";
  if (field === "type") return item.subject || "";
  return item.author || "";
}

function itemMatches(item, searchState) {
  const quickKeyword = searchState.quickKeyword.trim().toLowerCase();
  if (!quickKeyword) return true;
  return ["name", "type", "author"].some((field) =>
    getFieldValue(item, field).toLowerCase().includes(quickKeyword)
  );
}

function getBankTimeValue(item) {
  const raw = item?.CreateTime || item?.createTime || item?.updatedAt || "";
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortBanksByCreatedAtDesc(list) {
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
  const grouped = new Map();
  filteredRemoteBanks.value.forEach((item) => {
    const group = item.groupKey || "other";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(item);
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

function isRemoteGroupOpen(groupKey) {
  return Boolean(remoteExpandedState.value[groupKey]);
}

function toggleRemoteGroup(groupKey) {
  remoteExpandedState.value[groupKey] = !remoteExpandedState.value[groupKey];
}

function startPractice(id) {
  const allBanks = [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  const target = allBanks.find((item) => item.id === id);
  if (!target) return;
  const rawQuestions = Array.isArray(target.questions) ? target.questions : [];
  const questions = rawQuestions.map((question) => normalizeQuestionWithDetection(question));
  appState.questionsJSON = {
    bankId: target.id,
    bankSource: target.source || "local",
    version: resolveQuestionBankVersion(questions),
    name: target.title || target.name || "未命名题集",
    type: target.subject || target.type || "",
    author: target.author || "",
    questions
  };
  const saved = getProgressRecord(target.id);
  if (saved) {
    applyProgressToQuestions(questions, saved);
  }
  resetQuestionProgress(questions);
  router.push("/practice");
}

function downloadRemoteToLocal(id) {
  const target = questionBankState.remoteBanks.find((item) => item.id === id);
  if (!target) return;
  questionBankState.localBanks = addBankFromExisting("local", target);
  setStatusMessage(`已将网络题库《${target.title || "未命名"}》下载到本地`);
  bumpStorageRefresh();
}

async function loadRemotePapers() {
  await loadRemoteQuestionBanks({ force: true });
}

function syncQuestionBankPageData() {
  reloadLocalBanks();
}

function handleStorageChanged(event) {
  if (event?.detail?.kind === StorageChangeKind.localBanks) {
    syncQuestionBankPageData();
    storageRefreshToken.value += 1;
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
    <div v-if="questionBankState.statusMessage" class="alert alert-secondary py-2">
      {{ questionBankState.statusMessage }}
    </div>

    <StorageUsagePanel class="mb-3" :refresh-token="storageRefreshToken" />

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
          <div class="card-header">本地题集编辑</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-12 col-md-4">
                <label class="form-label">name</label>
                <input v-model="localEditState.title" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">type</label>
                <input v-model="localEditState.subject" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">author</label>
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
          :show-practice="true"
          :show-upload="false"
          @edit="startEditLocalBank"
          @remove="handleRemoveLocal"
          @export="exportBank('local', $event)"
          @practice="startPractice"
        />
      </div>

      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header">网络题库</div>
          <div class="card-body d-flex flex-column gap-3">
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
