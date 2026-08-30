import { computed, onActivated, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import FileSaver from "file-saver";
import {
  addBankFromExisting,
  exportBankAsJson,
  importBanksFromJson,
  isDraftBank,
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
import { useStartPracticeChoice } from "./useStartPracticeChoice";

type BankListItem = QuestionBankRecord & {
  groupKey?: string;
  groupLabel?: string;
  CreateTime?: string;
  createTime?: string;
  name?: string;
  type?: string;
};

interface SharedSearchState {
  quickKeyword: string;
}

type StatusVariant = "secondary" | "danger" | "success" | "warning";

export function useQuestionBankPage() {
  const router = useRouter();
  const {
    visible: startPracticeModalVisible,
    pendingBank: startPracticeBank,
    latest: startPracticeLatest,
    incompleteCount: startPracticeIncompleteCount,
    requestStart,
    resumeLatest: confirmResumePractice,
    createNew: confirmCreatePractice,
    cancel: cancelStartPractice
  } = useStartPracticeChoice();

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

  function openEditInEditor(id: string) {
    router.push({ path: "/editor", query: { bankId: id } });
  }

  function exportBank(source: "local" | "remote", id: string) {
    const list = source === "local" ? questionBankState.localBanks : questionBankState.remoteBanks;
    const target = list.find((item) => item.id === id);
    if (!target) return;
    const blob = new Blob([exportBankAsJson(target as Bank)], {
      type: "application/json;charset=utf-8"
    });
    FileSaver.saveAs(blob, `${target.title || "question-bank"}.json`);
  }

  function handleRemoveLocal(id: string) {
    const target = questionBankState.localBanks.find((item) => item.id === id);
    const name = target?.title || "未命名题库";
    if (!window.confirm(`确定删除《${name}》？此操作不可恢复。`)) return;
    const result = removeLocal(id);
    if (!result.ok) {
      setStatusMessage(result.message, "danger");
    }
  }

  async function importLocalBanksFromFile(file: File | null | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const beforeCount = questionBankState.localBanks.length;
      const result = importBanksFromJson("local", text);
      questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
      if (!result.ok) {
        setStatusMessage(result.message, "danger");
        return;
      }
      const added = Math.max(0, result.banks.length - beforeCount);
      setStatusMessage(`已导入 ${added} 个题集到本地题库`, "success");
    } catch {
      setStatusMessage("导入失败：JSON 格式无效。", "danger");
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

  const filteredLocalDraftBanks = computed(() =>
    sortBanksByCreatedAtDesc(
      questionBankState.localBanks.filter(
        (item) => isDraftBank(item) && itemMatches(item, sharedSearch.value)
      )
    )
  );

  const filteredLocalPublishedBanks = computed(() =>
    sortBanksByCreatedAtDesc(
      questionBankState.localBanks.filter(
        (item) => !isDraftBank(item) && itemMatches(item, sharedSearch.value)
      )
    )
  );

  const filteredLocalBanks = filteredLocalPublishedBanks;
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
    requestStart(target, router);
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

  return {
    sharedSearch,
    statusMessageVariant,
    filteredLocalBanks,
    filteredLocalDraftBanks,
    filteredLocalPublishedBanks,
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
  };
}
