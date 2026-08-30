import { onScopeDispose, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { appState } from "../state/appState";
import { questionBankState } from "../state/questionBankState";
import { upsertEditorDraft } from "../services/questionBank";
import type { LocalBankDraft } from "./useQuestionJsonWorkspace";

const DEBOUNCE_MS = 2000;
const MESSAGE_HIDE_MS = 2500;

export interface UseEditorDraftAutosaveOptions {
  editingBankId: Ref<string | null>;
  lastSavedBankId: Ref<string>;
  localBankDraft: Ref<LocalBankDraft>;
  suppressAutosave: Ref<boolean>;
  resolveBankId: () => string | null;
  onAutosaveError?: (message: string) => void;
}

export function useEditorDraftAutosave(options: UseEditorDraftAutosaveOptions) {
  const router = useRouter();
  const autosaveMessage = ref("");
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let messageTimer: ReturnType<typeof setTimeout> | null = null;

  function buildPayload() {
    const bankId = options.resolveBankId();
    return {
      id: bankId || undefined,
      title: options.localBankDraft.value.title,
      subject: options.localBankDraft.value.subject,
      author: options.localBankDraft.value.author,
      questions: appState.questionsJSON.questions,
      editorTxts: appState.txts.map((entry) => ({ ...entry }))
    };
  }

  function showAutosaveMessage() {
    autosaveMessage.value = "已自动保存";
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      autosaveMessage.value = "";
    }, MESSAGE_HIDE_MS);
  }

  function performAutosave() {
    if (options.suppressAutosave.value) return;
    const previousBankId = options.resolveBankId();
    const result = upsertEditorDraft("local", buildPayload());
    if (result.skipped) return;
    if (!result.ok) {
      options.onAutosaveError?.(result.message);
      return;
    }

    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;

    const bankId = result.bankId;
    if (!bankId) return;

    const isNew = !previousBankId;
    options.editingBankId.value = bankId;
    options.lastSavedBankId.value = bankId;
    appState.questionsJSON.bankId = bankId;
    appState.questionsJSON.bankSource = "local";

    if (isNew) {
      router.replace({
        query: { ...router.currentRoute.value.query, bankId }
      });
    }

    showAutosaveMessage();
  }

  function flushAutosave() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    performAutosave();
  }

  function scheduleAutosave() {
    if (options.suppressAutosave.value) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      performAutosave();
    }, DEBOUNCE_MS);
  }

  watch(() => appState.txts, scheduleAutosave, { deep: true });
  watch(() => appState.questionsJSON.questions, scheduleAutosave, { deep: true });
  watch(options.localBankDraft, scheduleAutosave, { deep: true });

  function onBeforeUnload() {
    flushAutosave();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", onBeforeUnload);
  }

  onScopeDispose(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (messageTimer) clearTimeout(messageTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", onBeforeUnload);
    }
    flushAutosave();
  });

  return {
    autosaveMessage,
    flushAutosave,
    scheduleAutosave
  };
}
