import { computed, nextTick, ref, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { appState } from "../state/appState";
import {
  initQuestionBankState,
  questionBankState,
  type QuestionBankRecord
} from "../state/questionBankState";
import { isDraftBank, publishBankFromQuestions } from "../services/questionBank";
import { questionsToTxtEntries } from "../services/questionsToTxtEntries";
import { normalizeQuestionWithDetection, resolveQuestionBankVersion, buildQuestionsFromTxt } from "../utils/questions";
import { useEditorDraftAutosave } from "./useEditorDraftAutosave";
import {
  draftFromBank,
  useQuestionJsonWorkspace,
  type LocalBankDraft
} from "./useQuestionJsonWorkspace";
import { useStartPracticeChoice } from "./useStartPracticeChoice";

export type Step1Mode = "manual" | "ai";

export interface UseQuestionEditorSessionOptions {
  /** Unique prefix for Bootstrap modal / checkbox ids on this page */
  idPrefix: string;
}

export function useQuestionEditorSession(options: UseQuestionEditorSessionOptions) {
  const route = useRoute();
  const router = useRouter();
  const step1Mode = ref<Step1Mode>("manual");
  const lastSavedBankId = ref("");
  const editingBankId = ref<string | null>(null);
  const loadError = ref("");
  const suppressAutosave = ref(false);
  const isEditMode = computed(() => Boolean(editingBankId.value));
  const isDraft = computed(() => {
    const id = editingBankId.value;
    if (!id) return true;
    const bank = questionBankState.localBanks.find((item) => item.id === id);
    if (!bank) return true;
    return isDraftBank(bank);
  });

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

  const {
    localBankDraft,
    localBankMessage,
    exportFileName,
    saveTargets,
    questionJSONPreview,
    clearQuestions,
    getFile,
    syncExportFileNameFromDraft,
    openSaveExportModal,
    saveByTarget,
    deleteQuestionsJSON
  } = useQuestionJsonWorkspace({
    clearMode: "edit",
    syncDraftFromImport: true,
    syncTxtsAfterImport: true,
    previewPretty: true,
    openModalDraftMode: "preferDraft",
    emptyExportMessage: "当前没有可导出的题目，请先生成或导入。",
    emptySaveMessage: "当前没有可保存的题目，请先生成或导入。",
    importSuccessMessage: (count) => `已导入 ${count} 题。`,
    saveToBrowser: (draft: LocalBankDraft) => {
      const hadBank = Boolean(editingBankId.value);
      const result = publishBankFromQuestions("local", editingBankId.value, {
        ...draft,
        questions: appState.questionsJSON.questions
      });
      if (result.ok && result.bankId) {
        lastSavedBankId.value = result.bankId;
        editingBankId.value = result.bankId;
        appState.questionsJSON.bankId = result.bankId;
        appState.questionsJSON.bankSource = "local";
        questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
        if (!route.query.bankId) {
          router.replace({ query: { ...route.query, bankId: result.bankId } });
        }
      }
      return {
        ok: result.ok,
        message: result.ok
          ? hadBank
            ? "已更新本地题集。"
            : "已保存到本地题库，可在题库页面查看和管理。"
          : result.message,
        banks: result.banks
      };
    },
    onBrowserSaved: () => {
      if (editingBankId.value) {
        lastSavedBankId.value = editingBankId.value;
      }
    }
  });

  function resolveBankIdFromRoute(): string | null {
    const raw = route.query.bankId;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) {
      return raw[0].trim();
    }
    return null;
  }

  function resolveEditingBankId(): string | null {
    return (
      editingBankId.value ||
      resolveBankIdFromRoute() ||
      appState.questionsJSON.bankId ||
      null
    );
  }

  const { autosaveMessage } = useEditorDraftAutosave({
    editingBankId,
    lastSavedBankId,
    localBankDraft,
    suppressAutosave,
    resolveBankId: resolveEditingBankId,
    onAutosaveError: (message) => {
      localBankMessage.value = message;
    }
  });

  const questionCount = computed(() => appState.questionsJSON.questions.length);
  const txtCount = computed(() => appState.txts.length);

  const modalId = `${options.idPrefix}-save-modal`;
  const modalTitleId = `${options.idPrefix}-save-modal-label`;
  const browserCheckboxId = `${options.idPrefix}-save-target-browser`;
  const fileCheckboxId = `${options.idPrefix}-save-target-file`;

  const saveModalTitle = computed(() =>
    isEditMode.value ? "更新本地题集" : "保存到本地题库"
  );

  function loadEditingBank(bank: QuestionBankRecord) {
    suppressAutosave.value = true;
    const questions = (Array.isArray(bank.questions) ? bank.questions : []).map((question) =>
      normalizeQuestionWithDetection(question)
    );
    appState.txts = bank.editorTxts?.length
      ? bank.editorTxts.map((entry) => ({ ...entry }))
      : questionsToTxtEntries(questions);
    appState.questionsJSON = {
      bankId: bank.id,
      bankSource: "local",
      version: resolveQuestionBankVersion(questions),
      name: bank.title || bank.name || "",
      type: bank.subject || bank.type || "",
      author: bank.author || "",
      questions
    };
    localBankDraft.value = draftFromBank(bank);
    localBankMessage.value = "";
    lastSavedBankId.value = bank.id;
    editingBankId.value = bank.id;
    loadError.value = "";
    step1Mode.value = "manual";
    nextTick(() => {
      suppressAutosave.value = false;
    });
  }

  function resetForCreate() {
    suppressAutosave.value = true;
    editingBankId.value = null;
    lastSavedBankId.value = "";
    loadError.value = "";
    appState.txts = [{ txt: "", MD5: false, image: "", noDelete: false, explanation: "" }];
    appState.questionsJSON = {
      notebookId: "",
      bankId: "",
      bankSource: "",
      version: "0.0.2",
      name: "",
      type: "",
      author: "",
      questions: [],
      practiceMode: "resume"
    };
    localBankDraft.value = { title: "", subject: "", author: "" };
    nextTick(() => {
      suppressAutosave.value = false;
    });
  }

  function syncFromRoute() {
    initQuestionBankState();
    const bankId = resolveBankIdFromRoute();
    if (!bankId) {
      resetForCreate();
      return;
    }
    const bank = questionBankState.localBanks.find((item) => item.id === bankId);
    if (!bank) {
      loadError.value = `未找到本地题集：${bankId}`;
      editingBankId.value = null;
      lastSavedBankId.value = "";
      return;
    }
    loadEditingBank(bank);
  }

  watch(
    () => route.query.bankId,
    () => {
      syncFromRoute();
    },
    { immediate: true }
  );

  function goPracticeAfterSave() {
    const bankId = lastSavedBankId.value || editingBankId.value;
    if (!bankId) {
      localBankMessage.value = "请先生成题集并保存到本地题库。";
      return;
    }
    const bank = questionBankState.localBanks.find((item) => item.id === bankId);
    if (!bank) {
      localBankMessage.value = "未找到刚保存的题集，请前往题库页开练。";
      return;
    }
    requestStart(bank, router);
  }

  async function generateAndSaveToLocalBank() {
    localBankMessage.value = "";
    appState.questionsJSON.name = localBankDraft.value.title.trim();
    appState.questionsJSON.type = localBankDraft.value.subject.trim();
    appState.questionsJSON.author = localBankDraft.value.author.trim();

    const questions = buildQuestionsFromTxt(appState.txts, []).map((question) =>
      normalizeQuestionWithDetection(question)
    );
    appState.questionsJSON.questions = questions;
    appState.questionsJSON.version = resolveQuestionBankVersion(questions);

    if (!questions.length) {
      localBankMessage.value = "未能从录入内容生成题目，请检查格式。";
      return false;
    }

    const bankId = resolveEditingBankId();
    const hadBank = Boolean(bankId);
    const result = publishBankFromQuestions("local", bankId, {
      title: localBankDraft.value.title,
      subject: localBankDraft.value.subject,
      author: localBankDraft.value.author,
      questions
    });

    if (result.ok && result.bankId) {
      lastSavedBankId.value = result.bankId;
      editingBankId.value = result.bankId;
      appState.questionsJSON.bankId = result.bankId;
      appState.questionsJSON.bankSource = "local";
      questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
      if (!route.query.bankId) {
        router.replace({ query: { ...route.query, bankId: result.bankId } });
      }
      localBankMessage.value = hadBank
        ? "已生成并更新本地题集。"
        : "已生成并保存到本地题库。";
      return true;
    }

    localBankMessage.value = result.ok ? "保存失败。" : result.message;
    return false;
  }

  function addEmptyTxt() {
    appState.txts.push({ MD5: false, txt: "", image: "", noDelete: false, explanation: "" });
  }

  function scrollToTxtIndex(index: number) {
    if (typeof document === "undefined") return;
    const items = document.querySelectorAll(".step1-question-item");
    const el = items[index];
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return {
    step1Mode,
    lastSavedBankId,
    editingBankId,
    isEditMode,
    isDraft,
    loadError,
    autosaveMessage,
    localBankDraft,
    localBankMessage,
    exportFileName,
    saveTargets,
    questionJSONPreview,
    questionCount,
    txtCount,
    modalId,
    modalTitleId,
    browserCheckboxId,
    fileCheckboxId,
    saveModalTitle,
    clearQuestions,
    getFile,
    syncExportFileNameFromDraft,
    openSaveExportModal,
    saveByTarget,
    deleteQuestionsJSON,
    goPracticeAfterSave,
    generateAndSaveToLocalBank,
    addEmptyTxt,
    scrollToTxtIndex,
    syncFromRoute,
    startPracticeModalVisible,
    startPracticeBank,
    startPracticeLatest,
    startPracticeIncompleteCount,
    confirmResumePractice,
    confirmCreatePractice,
    cancelStartPractice
  };
}

export type QuestionEditorSession = ReturnType<typeof useQuestionEditorSession>;
export type LocalBankDraftModel = Ref<LocalBankDraft>;
