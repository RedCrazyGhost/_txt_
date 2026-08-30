import { computed, ref, type Ref } from "vue";
import FileSaver from "file-saver";
import { appState } from "../state/appState";
import { questionBankState } from "../state/questionBankState";
import { syncHomeSessionProgress } from "../services/homeQuestionsJson";
import { questionsToTxtEntries } from "../services/questionsToTxtEntries";
import {
  buildQuestionJsonExportFilename,
  buildQuestionJsonPreviewPayload,
  ensureJsonFilename,
  normalizeImportedQuestionJson,
  type LocalBankDraft,
  type SaveTarget
} from "../services/questionJsonIo";
import { resolveQuestionBankVersion } from "../utils/questions";
import { getTime } from "../utils/time";
import type { QuestionBankRecord } from "../state/questionBankState";

export interface SaveBankResult {
  ok: boolean;
  message: string;
  banks: unknown;
}

export interface UseQuestionJsonWorkspaceOptions {
  /** Home clears all meta; CreatePanel keeps draft title/subject/author */
  clearMode?: "home" | "edit";
  /** After import, copy missing draft fields from JSON meta */
  syncDraftFromImport?: boolean;
  /** After import, rebuild appState.txts from questions */
  syncTxtsAfterImport?: boolean;
  /** Pretty-print JSON preview (CreatePanel) */
  previewPretty?: boolean;
  /** Message templates; use {filename} / {count} placeholders where noted */
  emptyExportMessage?: string;
  emptySaveMessage?: string;
  importSuccessMessage?: (count: number) => string;
  /** Persist to browser local bank; return result for UI message */
  saveToBrowser: (draft: LocalBankDraft) => SaveBankResult;
  onBrowserSaved?: (result: SaveBankResult) => void;
  /** When opening modal: reset draft from appState (home) or keep/merge (edit) */
  openModalDraftMode?: "fromAppState" | "preferDraft";
}

export function useQuestionJsonWorkspace(options: UseQuestionJsonWorkspaceOptions) {
  const clearMode = options.clearMode ?? "home";
  const syncDraftFromImport = options.syncDraftFromImport ?? false;
  const syncTxtsAfterImport = options.syncTxtsAfterImport ?? false;
  const previewPretty = options.previewPretty ?? false;
  const openModalDraftMode = options.openModalDraftMode ?? "fromAppState";
  const emptyExportMessage =
    options.emptyExportMessage ?? "当前没有可导出的题目，请先生成或导入 JSON。";
  const emptySaveMessage =
    options.emptySaveMessage ?? "当前没有可保存的题目，请先生成或导入 JSON。";

  const localBankDraft = ref<LocalBankDraft>({
    title: "",
    subject: "",
    author: ""
  });
  const localBankMessage = ref("");
  const exportFileName = ref("");
  const saveTargets = ref<SaveTarget[]>(["browser"]);

  function normalizeMetaFromDraft() {
    appState.questionsJSON.name = localBankDraft.value.title.trim();
    appState.questionsJSON.type = localBankDraft.value.subject.trim();
    appState.questionsJSON.author = localBankDraft.value.author.trim();
  }

  function buildExportFilename() {
    return buildQuestionJsonExportFilename({
      name: appState.questionsJSON.name,
      type: appState.questionsJSON.type,
      author: appState.questionsJSON.author
    });
  }

  function syncExportFileNameFromDraft() {
    exportFileName.value = buildQuestionJsonExportFilename({
      name: localBankDraft.value.title.trim(),
      type: localBankDraft.value.subject.trim(),
      author: localBankDraft.value.author.trim()
    });
  }

  function openSaveExportModal() {
    if (openModalDraftMode === "fromAppState") {
      localBankDraft.value = {
        title: appState.questionsJSON.name || "",
        subject: appState.questionsJSON.type || "",
        author: appState.questionsJSON.author || ""
      };
    } else {
      localBankDraft.value = {
        title: localBankDraft.value.title || appState.questionsJSON.name || "",
        subject: localBankDraft.value.subject || appState.questionsJSON.type || "",
        author: localBankDraft.value.author || appState.questionsJSON.author || ""
      };
    }
    exportFileName.value = buildExportFilename();
    saveTargets.value = ["browser"];
    localBankMessage.value = "";
  }

  async function clearQuestions() {
    if (clearMode === "home") {
      appState.questionsJSON.questions = [];
      appState.questionsJSON.name = "";
      appState.questionsJSON.type = "";
      appState.questionsJSON.author = "";
      appState.questionsJSON.bankId = "";
      appState.questionsJSON.bankSource = "";
    } else {
      appState.questionsJSON.questions = [];
      appState.questionsJSON.name = localBankDraft.value.title;
      appState.questionsJSON.type = localBankDraft.value.subject;
      appState.questionsJSON.author = localBankDraft.value.author;
    }
    const { resetQuestionProgress } = await import("../models/question/progress");
    resetQuestionProgress([]);
  }

  function getFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    for (let index = 0; index < input.files.length; index += 1) {
      const reader = new FileReader();
      reader.readAsText(input.files[index]);
      reader.onload = async function load(this: FileReader) {
        const { normalizeQuestionWithDetection, resolveQuestionBankVersion: resolveVersion } =
          await import("../utils/questions");
        const imported = normalizeImportedQuestionJson(JSON.parse(String(this.result ?? "")));
        if (!appState.questionsJSON.type && imported.type) {
          appState.questionsJSON.type = imported.type;
        }
        if (!appState.questionsJSON.author && imported.author) {
          appState.questionsJSON.author = imported.author;
        }
        if (!appState.questionsJSON.name && imported.name) {
          appState.questionsJSON.name = imported.name;
        }
        if (syncDraftFromImport) {
          if (!localBankDraft.value.title && imported.name) {
            localBankDraft.value.title = imported.name;
          }
          if (!localBankDraft.value.subject && imported.type) {
            localBankDraft.value.subject = imported.type;
          }
          if (!localBankDraft.value.author && imported.author) {
            localBankDraft.value.author = imported.author;
          }
        }
        Object.values(imported.questions || {}).forEach((item) => {
          appState.questionsJSON.questions.push(normalizeQuestionWithDetection(item));
        });
        appState.questionsJSON.version = resolveVersion(appState.questionsJSON.questions);
        if (syncTxtsAfterImport) {
          appState.txts = questionsToTxtEntries(appState.questionsJSON.questions);
        }
        await syncHomeSessionProgress(appState.questionsJSON.questions);
        if (options.importSuccessMessage) {
          localBankMessage.value = options.importSuccessMessage(imported.questions.length);
        }
      };
    }
    if (syncDraftFromImport) {
      input.value = "";
    }
  }

  function exportQuestionJSON() {
    if (!appState.questionsJSON.questions.length) {
      localBankMessage.value = emptyExportMessage;
      return;
    }
    normalizeMetaFromDraft();
    const time = new Date();
    const finalFilename = ensureJsonFilename(exportFileName.value, buildExportFilename());
    appState.questionsJSON.CreateTime = getTime(time);
    appState.questionsJSON.version = resolveQuestionBankVersion(appState.questionsJSON.questions);
    const blob = new Blob([JSON.stringify(appState.questionsJSON)], {
      type: "text/json;charset=utf-8"
    });
    FileSaver.saveAs(blob, finalFilename);
    localBankMessage.value = `已导出：${finalFilename}`;
  }

  function saveToLocalBank() {
    if (!appState.questionsJSON.questions.length) {
      localBankMessage.value = emptySaveMessage;
      return;
    }
    normalizeMetaFromDraft();
    const result = options.saveToBrowser(localBankDraft.value);
    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
    localBankMessage.value = result.message;
    if (result.ok) {
      options.onBrowserSaved?.(result);
    }
  }

  function saveByTarget() {
    if (!saveTargets.value.length) {
      localBankMessage.value = "请至少选择一个保存目标。";
      return;
    }
    if (saveTargets.value.includes("browser")) {
      saveToLocalBank();
    }
    if (saveTargets.value.includes("file")) {
      exportQuestionJSON();
    }
  }

  const questionJSONPreview = computed(() => {
    const payload = buildQuestionJsonPreviewPayload({
      version: resolveQuestionBankVersion(appState.questionsJSON.questions),
      name: appState.questionsJSON.name || "",
      type: appState.questionsJSON.type || "",
      author: appState.questionsJSON.author || "",
      questions: appState.questionsJSON.questions
    });
    return previewPretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  });

  return {
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
    /** Alias used by Home template */
    deleteQuestionsJSON: clearQuestions
  };
}

/** Helper for CreatePanel: seed draft from an existing bank record */
export function draftFromBank(bank: QuestionBankRecord): LocalBankDraft {
  return {
    title: bank.title || bank.name || "",
    subject: bank.subject || bank.type || "",
    author: bank.author || ""
  };
}

export type { LocalBankDraft, SaveTarget };
export type QuestionJsonWorkspace = ReturnType<typeof useQuestionJsonWorkspace>;
export type LocalBankDraftRef = Ref<LocalBankDraft>;
