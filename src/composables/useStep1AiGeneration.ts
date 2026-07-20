import { nextTick, type Ref } from "vue";
import { appState, type TxtEntry } from "../state/appState";
import type { AiConfig } from "../services/ai/aiConfigStorage";
import { formatQuestionText, generateQuestionsFromAi } from "../services/ai/generateQuestions";
import {
  addReferenceFiles,
  formatUserMessageWithReferences,
  type ReferenceFile
} from "../services/ai/referenceFile";
import {
  formatReviewStatusMessage,
  reviewGeneratedAnswers,
  summarizeReviewVerdicts,
  type ReviewedQuestion,
  type Verdict
} from "../services/ai/reviewGeneratedAnswers";
import { generateQuestionsJsonFromTxts } from "../services/homeQuestionsJson";
import type {
  AiPanelMessage,
  AiPanelMessageExtra,
  LoadingPhase,
  MessageRole,
  MessageVariant,
  WriteMode
} from "../types/step1AiPanel";

export interface UseStep1AiGenerationDeps {
  persist: () => AiConfig;
  apiKey: Ref<string>;
  refreshBalance: () => Promise<void>;
  messages: Ref<AiPanelMessage[]>;
  loading: Ref<boolean>;
  loadingPhase: Ref<LoadingPhase>;
  settingsOpen: Ref<boolean>;
  userPrompt: Ref<string>;
  referenceFiles: Ref<ReferenceFile[]>;
  composerError: Ref<string>;
  defaultWriteMode: Ref<WriteMode>;
  getMessagesEl: () => HTMLElement | null;
  getPromptEl: () => HTMLTextAreaElement | null;
  referenceInputEl: Ref<HTMLInputElement | null>;
}

export function useStep1AiGeneration(deps: UseStep1AiGenerationDeps) {
  function createTxtEntry(item: ReviewedQuestion): TxtEntry {
    const explanation = typeof item?.explanation === "string" ? item.explanation.trim() : "";
    return {
      MD5: false,
      txt: item.txt,
      image: "",
      noDelete: false,
      ...(explanation ? { explanation } : {})
    };
  }

  function applyGeneratedTxts(generatedQuestions: ReviewedQuestion[], mode: WriteMode = "replace") {
    const entries = generatedQuestions.map((item) => createTxtEntry(item));
    if (mode === "append") {
      const hasOnlyEmptyPlaceholder =
        appState.txts.length === 1 && !appState.txts[0].txt.trim() && !appState.txts[0].image;
      if (hasOnlyEmptyPlaceholder) {
        appState.txts.splice(0, appState.txts.length, ...entries);
      } else {
        appState.txts.push(...entries);
      }
    } else {
      appState.txts.splice(0, appState.txts.length, ...entries);
    }
  }

  function applyGeneratedMeta(data: { name?: string; type?: string; author?: string }) {
    if (data.name) appState.questionsJSON.name = data.name;
    if (data.type) appState.questionsJSON.type = data.type;
    if (data.author) appState.questionsJSON.author = data.author;
  }

  async function scrollMessagesToBottom() {
    await nextTick();
    const el = deps.getMessagesEl();
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  function pushMessage(
    role: MessageRole,
    content: string,
    variant: MessageVariant = "default",
    extra: AiPanelMessageExtra = {}
  ) {
    deps.messages.value.push({ role, content, variant, ...extra, selected: extra.selected ?? [] });
    scrollMessagesToBottom();
  }

  function formatQuestionTextForMessage(msg: AiPanelMessage, txt: string) {
    return formatQuestionText(txt, Boolean(msg.showAnswers));
  }

  function verdictLabel(verdict: Verdict) {
    if (verdict === "pass") return "通过";
    if (verdict === "fail") return "不通过";
    return "存疑";
  }

  function getSelectedQuestions(msg: AiPanelMessage) {
    if (!msg.questions?.length) return [];
    return msg.questions.filter((_, index) => msg.selected[index] !== false);
  }

  function isAllQuestionsSelected(msg: AiPanelMessage) {
    return Boolean(msg.questions?.length && msg.questions.every((_, index) => msg.selected[index] !== false));
  }

  function toggleAllQuestions(msg: AiPanelMessage) {
    if (!msg.questions?.length) return;
    const nextValue = !isAllQuestionsSelected(msg);
    msg.selected = msg.questions.map(() => nextValue);
  }

  async function applyMessageToTxts(msg: AiPanelMessage, mode: WriteMode) {
    const selectedQuestions = getSelectedQuestions(msg);
    if (!selectedQuestions.length) {
      deps.composerError.value = "请至少选择一道题目。";
      return;
    }
    deps.composerError.value = "";
    applyGeneratedTxts(selectedQuestions, mode);
    if (msg.meta) applyGeneratedMeta(msg.meta);
    deps.defaultWriteMode.value = mode;
    msg.writeMode = mode;

    try {
      await generateQuestionsJsonFromTxts();
    } catch {
      deps.composerError.value = "生成 JSON 失败，请检查题目格式。";
    }
  }

  function focusComposer() {
    nextTick(() => {
      deps.getPromptEl()?.focus();
    });
  }

  function applyExample(text: string) {
    deps.userPrompt.value = text;
    deps.composerError.value = "";
    focusComposer();
  }

  function clearComposerError() {
    if (deps.composerError.value) {
      deps.composerError.value = "";
    }
  }

  function triggerReferencePicker() {
    if (deps.loading.value) return;
    deps.referenceInputEl.value?.click();
  }

  async function handleReferenceChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const result = await addReferenceFiles(deps.referenceFiles.value, input.files);
    input.value = "";

    if (!result.ok) {
      deps.composerError.value = result.error || "添加参考文件失败。";
      return;
    }

    deps.referenceFiles.value = result.files;
    clearComposerError();
  }

  function removeReferenceFile(name: string) {
    deps.referenceFiles.value = deps.referenceFiles.value.filter((file) => file.name !== name);
  }

  function clearReferenceFiles() {
    deps.referenceFiles.value = [];
    if (deps.referenceInputEl.value) {
      deps.referenceInputEl.value.value = "";
    }
  }

  async function handleGenerate() {
    if (deps.loading.value) return;

    const trimmedPrompt = deps.userPrompt.value.trim();
    if (!trimmedPrompt) {
      deps.composerError.value = "请输入生成要求。";
      focusComposer();
      return;
    }
    if (!deps.apiKey.value.trim()) {
      deps.composerError.value = "请先在模型设置中填写 API Key。";
      deps.settingsOpen.value = true;
      return;
    }

    deps.composerError.value = "";
    const refs = [...deps.referenceFiles.value];
    pushMessage("user", formatUserMessageWithReferences(trimmedPrompt, refs));
    deps.userPrompt.value = "";
    clearReferenceFiles();
    deps.loading.value = true;
    deps.loadingPhase.value = "generate";

    const config = deps.persist();

    try {
      const result = await generateQuestionsFromAi({
        prompt: trimmedPrompt,
        references: refs,
        config
      });

      if (!result.ok) {
        pushMessage("assistant", result.message || "生成失败，请重试。", "error");
        return;
      }

      deps.loadingPhase.value = "review";
      const reviewResult = await reviewGeneratedAnswers({
        questions: result.data.questions,
        config
      });

      const reviewedQuestions = reviewResult.questions;
      const summary = summarizeReviewVerdicts(reviewedQuestions);
      const statusMessage = formatReviewStatusMessage(summary, {
        generationMessage: result.message,
        reviewFailed: Boolean(reviewResult.reviewFailed),
        reviewFailMessage: reviewResult.reviewFailed ? reviewResult.message : ""
      });

      const messagePayload: AiPanelMessageExtra = {
        questions: reviewedQuestions,
        meta: {
          name: result.data.name,
          type: result.data.type,
          author: result.data.author
        },
        selected: reviewedQuestions.map((question) => question.verdict === "pass"),
        showAnswers: false,
        showExplanation: false,
        writeMode: null
      };

      pushMessage("assistant", statusMessage, "success", messagePayload);
    } finally {
      deps.loading.value = false;
      deps.loadingPhase.value = "";
      await deps.refreshBalance();
      focusComposer();
    }
  }

  function handlePromptKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleGenerate();
    }
  }

  function autoResizePrompt() {
    const el = deps.getPromptEl();
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return {
    pushMessage,
    formatQuestionTextForMessage,
    verdictLabel,
    isAllQuestionsSelected,
    toggleAllQuestions,
    applyMessageToTxts,
    applyExample,
    clearComposerError,
    triggerReferencePicker,
    handleReferenceChange,
    removeReferenceFile,
    handleGenerate,
    handlePromptKeydown,
    autoResizePrompt,
    focusComposer,
    scrollMessagesToBottom
  };
}
