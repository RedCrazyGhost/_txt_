import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import FileSaver from "file-saver";
import {
  StorageChangeKind,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "../services/appStorageSync";
import {
  NotebookFilter,
  ProgressStatus,
  countByNotebookFilter,
  createWrongNotebook,
  exportPracticeProgressStore,
  getNotebookKindLabel,
  importPracticeProgressStore,
  listNotebookGroups,
  listNotebooks,
  removeProgressRecord,
  type BankLike,
  type BankNotebookGroup,
  type EnrichedNotebook,
  type NotebookFilter as NotebookFilterType
} from "../services/practiceProgress";
import { resumeNotebookAndGo } from "../services/practiceSession";
import { loadRemoteQuestionBanks, reloadRemoteBanksFromCache } from "../services/remoteQuestionBanks";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState";
import { getTimeYYYYMMDD } from "../utils/time";
import type { GenerateWrongNotebookTarget } from "../components/practice/GenerateWrongNotebookModal.vue";

export const NOTEBOOK_FILTER_OPTIONS: Array<{ key: NotebookFilterType; label: string }> = [
  { key: NotebookFilter.ALL, label: "全部" },
  { key: NotebookFilter.IN_PROGRESS, label: "进行中" },
  { key: NotebookFilter.COMPLETED, label: "已完成" },
  { key: NotebookFilter.HAS_WRONG, label: "有错题" },
  { key: NotebookFilter.INVALID, label: "已失效" }
];

export function canResumeNotebook(notebook: Pick<EnrichedNotebook, "status">) {
  return notebook.status !== ProgressStatus.INVALID;
}

function formatNotebookDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeYYYYMMDD(date);
}

function notebookSearchText(notebook: EnrichedNotebook): string {
  const parts = [
    notebook.name,
    notebook.updatedAt,
    notebook.createdAt,
    formatNotebookDate(notebook.updatedAt || notebook.createdAt),
    formatNotebookDate(notebook.createdAt),
    getNotebookKindLabel(notebook.kind)
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function groupSearchText(group: BankNotebookGroup): string {
  return [group.name, group.type, group.author].filter(Boolean).join(" ").toLowerCase();
}

function notebookMatchesKeyword(notebook: EnrichedNotebook, keyword: string) {
  return notebookSearchText(notebook).includes(keyword);
}

function filterNotebookTree(
  notebook: EnrichedNotebook,
  keyword: string
): EnrichedNotebook | null {
  const filteredChildren = notebook.children
    .map((child) => filterNotebookTree(child, keyword))
    .filter((child): child is EnrichedNotebook => child !== null);

  if (notebookMatchesKeyword(notebook, keyword)) {
    return notebook;
  }

  if (filteredChildren.length > 0) {
    return { ...notebook, children: filteredChildren };
  }

  return null;
}

export function filterNotebookGroups(groups: BankNotebookGroup[], keyword: string): BankNotebookGroup[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return groups;

  const filtered: BankNotebookGroup[] = [];

  for (const group of groups) {
    if (groupSearchText(group).includes(normalized)) {
      filtered.push(group);
      continue;
    }

    const notebooks = group.notebooks
      .map((notebook) => filterNotebookTree(notebook, normalized))
      .filter((notebook): notebook is EnrichedNotebook => notebook !== null);

    const orphanWrongNotebooks = group.orphanWrongNotebooks
      .map((notebook) => filterNotebookTree(notebook, normalized))
      .filter((notebook): notebook is EnrichedNotebook => notebook !== null);

    if (notebooks.length === 0 && orphanWrongNotebooks.length === 0) {
      continue;
    }

    filtered.push({
      ...group,
      notebooks,
      orphanWrongNotebooks
    });
  }

  return filtered;
}

export function usePracticeProgressPage() {
  const route = useRoute();
  const router = useRouter();

  const activeFilter = ref<NotebookFilterType>(NotebookFilter.ALL);
  const searchKeyword = ref("");
  const allNotebooks = ref<EnrichedNotebook[]>([]);
  const groups = ref<BankNotebookGroup[]>([]);
  const pendingDelete = ref<EnrichedNotebook | null>(null);
  const pendingWrong = ref<EnrichedNotebook | null>(null);

  const pendingWrongTarget = computed<GenerateWrongNotebookTarget | null>(() => {
    const notebook = pendingWrong.value;
    if (!notebook) return null;
    return {
      key: notebook.id,
      name: notebook.name || "未命名题集",
      kindLabel: getNotebookKindLabel(notebook.kind),
      wrongQuestionCount: notebook.wrongQuestionCount,
      wrongWithPartialCount: notebook.wrongWithPartialCount
    };
  });

  function getAllBanks() {
    return [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  }

  function buildRouteQuery(): Record<string, string> {
    const query: Record<string, string> = {};
    if (activeFilter.value !== NotebookFilter.ALL) {
      query.filter = activeFilter.value;
    }
    const trimmed = searchKeyword.value.trim();
    if (trimmed) {
      query.q = trimmed;
    }
    return query;
  }

  function refreshRecords() {
    const banks = getAllBanks() as BankLike[];
    allNotebooks.value = listNotebooks({ filter: NotebookFilter.ALL }, banks);
    const rawGroups = listNotebookGroups({ filter: activeFilter.value }, banks);
    groups.value = filterNotebookGroups(rawGroups, searchKeyword.value);
  }

  function replaceRouteQuery() {
    router.replace({
      path: "/practice-progress",
      query: buildRouteQuery()
    });
  }

  async function syncProgressPageData() {
    reloadLocalBanks();
    await loadRemoteQuestionBanks();
    refreshRecords();
  }

  function handleStorageChanged(event: Event) {
    const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
    if (kind === StorageChangeKind.localBanks) {
      reloadLocalBanks();
      refreshRecords();
      return;
    }
    if (kind === StorageChangeKind.remoteBanks) {
      reloadRemoteBanksFromCache();
      refreshRecords();
      return;
    }
    if (kind === StorageChangeKind.practiceProgress) {
      refreshRecords();
    }
  }

  function syncFilterFromRoute() {
    const queryFilter = route.query.filter;
    const normalized = Array.isArray(queryFilter) ? queryFilter[0] : queryFilter;
    if (NOTEBOOK_FILTER_OPTIONS.some((item) => item.key === normalized)) {
      activeFilter.value = normalized as NotebookFilterType;
      return;
    }
    activeFilter.value = NotebookFilter.ALL;
  }

  function syncSearchFromRoute() {
    const queryQ = route.query.q;
    const normalized = Array.isArray(queryQ) ? queryQ[0] : queryQ;
    searchKeyword.value = normalized ?? "";
  }

  function syncFromRoute() {
    syncFilterFromRoute();
    syncSearchFromRoute();
  }

  const statusCounts = computed(() => countByNotebookFilter(allNotebooks.value));

  const notebookById = computed(() => new Map(allNotebooks.value.map((item) => [item.id, item])));

  const isEmptyAll = computed(() => allNotebooks.value.length === 0);
  const hasActiveSearch = computed(() => searchKeyword.value.trim().length > 0);
  const isEmptyFiltered = computed(() => !isEmptyAll.value && groups.value.length === 0);

  function filterCount(optionKey: NotebookFilterType) {
    return statusCounts.value[optionKey] ?? statusCounts.value.all;
  }

  function isFilterDisabled(optionKey: NotebookFilterType) {
    return optionKey !== NotebookFilter.ALL && filterCount(optionKey) === 0;
  }

  function filterDisabledTitle(optionKey: NotebookFilterType) {
    const option = NOTEBOOK_FILTER_OPTIONS.find((item) => item.key === optionKey);
    if (!option || !isFilterDisabled(optionKey)) return undefined;
    return `暂无${option.label}记录`;
  }

  function setFilter(filter: NotebookFilterType) {
    if (isFilterDisabled(filter)) return;
    activeFilter.value = filter;
    replaceRouteQuery();
    refreshRecords();
  }

  function applySearch() {
    replaceRouteQuery();
    refreshRecords();
  }

  function clearSearch() {
    searchKeyword.value = "";
    replaceRouteQuery();
    refreshRecords();
  }

  function canResume(notebook: EnrichedNotebook) {
    return canResumeNotebook(notebook);
  }

  function resume(notebook: EnrichedNotebook) {
    if (!canResume(notebook)) return;
    resumeNotebookAndGo(notebook, getAllBanks(), router);
  }

  function requestWrong(notebook: EnrichedNotebook) {
    if (notebook.wrongQuestionCount <= 0 && notebook.wrongWithPartialCount <= 0) return;
    pendingWrong.value = notebook;
  }

  function cancelWrong() {
    pendingWrong.value = null;
  }

  function confirmWrong(includePartial = false) {
    const notebook = pendingWrong.value;
    if (!notebook) return;

    const available = includePartial
      ? notebook.wrongWithPartialCount
      : notebook.wrongQuestionCount;
    if (available <= 0) {
      window.alert(
        includePartial ? "当前没有错题或半对可生成错题本。" : "当前没有错题可生成错题本。"
      );
      return;
    }

    const created = createWrongNotebook(notebook, {
      includePartial,
      banks: getAllBanks() as BankLike[]
    });
    pendingWrong.value = null;
    if (!created) {
      window.alert(
        includePartial ? "当前没有错题或半对可生成错题本。" : "当前没有错题可生成错题本。"
      );
      return;
    }
    refreshRecords();
  }

  function requestDelete(notebook: EnrichedNotebook) {
    pendingDelete.value = notebook;
  }

  function cancelDelete() {
    pendingDelete.value = null;
  }

  function confirmDelete() {
    const notebook = pendingDelete.value;
    if (!notebook) return;
    removeProgressRecord(notebook.id);
    pendingDelete.value = null;
    refreshRecords();
  }

  function exportArchiveBackup() {
    const json = exportPracticeProgressStore();
    const date = getTimeYYYYMMDD(new Date()).replace(/-/g, "");
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    FileSaver.saveAs(blob, `练习档案-${date}.json`);
  }

  async function importArchiveBackup(file: File | null | undefined) {
    if (!file) return;
    if (!window.confirm("导入将覆盖当前全部练习档案，确定继续？")) return;
    try {
      const text = await file.text();
      const result = importPracticeProgressStore(text);
      if (!result.ok) {
        window.alert(result.message);
        return;
      }
      refreshRecords();
    } catch {
      window.alert("备份文件读取失败。");
    }
  }

  watch(
    () => [route.query.filter, route.query.q],
    () => {
      syncFromRoute();
      refreshRecords();
    }
  );

  onMounted(() => {
    syncFromRoute();
    syncProgressPageData();
    subscribeStorageChanged(handleStorageChanged);
  });

  onActivated(() => {
    syncProgressPageData();
  });

  onBeforeUnmount(() => {
    unsubscribeStorageChanged(handleStorageChanged);
  });

  return {
    activeFilter,
    searchKeyword,
    filterOptions: NOTEBOOK_FILTER_OPTIONS,
    statusCounts,
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
  };
}
