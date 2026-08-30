import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { appState } from "../state/appState";
import { questionBankState } from "../state/questionBankState";
import type { UpsertEditorDraftResult } from "../services/questionBank";
import { useEditorDraftAutosave } from "./useEditorDraftAutosave";

const replaceMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    replace: replaceMock,
    currentRoute: { value: { query: {} } }
  })
}));

vi.mock("../services/questionBank", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/questionBank")>();
  return {
    ...actual,
    upsertEditorDraft: (...args: unknown[]) => upsertMock(...args)
  };
});

function okResult(bankId: string): UpsertEditorDraftResult {
  return { ok: true, banks: [{ id: bankId } as never], bankId };
}

function runAutosave(
  overrides: Partial<{
    editingBankId: string | null;
    lastSavedBankId: string;
    suppressAutosave: boolean;
    resolveBankId: () => string | null;
    onAutosaveError: (message: string) => void;
  }> = {}
) {
  const editingBankId = ref<string | null>(overrides.editingBankId ?? null);
  const lastSavedBankId = ref(overrides.lastSavedBankId ?? "");
  const localBankDraft = ref({ title: "题集", subject: "类型", author: "作者" });
  const suppressAutosave = ref(overrides.suppressAutosave ?? false);
  const onAutosaveError = overrides.onAutosaveError;

  const scope = effectScope();
  const api = scope.run(() =>
    useEditorDraftAutosave({
      editingBankId,
      lastSavedBankId,
      localBankDraft,
      suppressAutosave,
      resolveBankId: overrides.resolveBankId ?? (() => editingBankId.value),
      onAutosaveError
    })
  );

  if (!api) throw new Error("failed to init autosave");

  return {
    scope,
    api,
    editingBankId,
    lastSavedBankId,
    localBankDraft,
    suppressAutosave
  };
}

describe("useEditorDraftAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    upsertMock.mockReset();
    replaceMock.mockReset();
    upsertMock.mockReturnValue(okResult("local-1"));
    appState.txts = [{ txt: "题目一", MD5: false, image: "", noDelete: false }];
    appState.questionsJSON = {
      notebookId: "",
      bankId: "",
      bankSource: "",
      version: "0.0.2",
      name: "",
      type: "",
      author: "",
      questions: [
        {
          texts: ["题目一"],
          answers: [["答案"]],
          results: [],
          image: "",
          explanation: ""
        }
      ],
      practiceMode: "resume"
    };
    questionBankState.localBanks = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces and calls upsertEditorDraft after edits", async () => {
    upsertMock.mockReturnValue(okResult("local-1"));

    const { scope, localBankDraft } = runAutosave();
    localBankDraft.value = { ...localBankDraft.value, title: "新标题" };
    await nextTick();
    expect(upsertMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0]![0]).toBe("local");

    scope.stop();
  });

  it("does not write when suppressAutosave is true", async () => {
    const { scope, api, localBankDraft, suppressAutosave } = runAutosave({
      suppressAutosave: true
    });
    localBankDraft.value = { ...localBankDraft.value, title: "被抑制" };
    await nextTick();
    vi.advanceTimersByTime(2000);
    expect(upsertMock).not.toHaveBeenCalled();

    api.flushAutosave();
    expect(upsertMock).not.toHaveBeenCalled();

    upsertMock.mockReturnValue(okResult("local-1"));
    suppressAutosave.value = false;
    api.flushAutosave();
    expect(upsertMock).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it("assigns bankId and replaces route for a new draft", () => {
    upsertMock.mockReturnValue(okResult("local-new"));

    const { scope, api, editingBankId, lastSavedBankId } = runAutosave({
      editingBankId: null,
      resolveBankId: () => null
    });

    api.flushAutosave();

    expect(editingBankId.value).toBe("local-new");
    expect(lastSavedBankId.value).toBe("local-new");
    expect(appState.questionsJSON.bankId).toBe("local-new");
    expect(appState.questionsJSON.bankSource).toBe("local");
    expect(replaceMock).toHaveBeenCalledWith({ query: { bankId: "local-new" } });
    expect(api.autosaveMessage.value).toBe("已自动保存");

    scope.stop();
  });

  it("flushAutosave writes immediately and cancels pending debounce", async () => {
    upsertMock.mockReturnValue(okResult("local-1"));

    const { scope, api, localBankDraft } = runAutosave({
      editingBankId: "local-1",
      resolveBankId: () => "local-1"
    });

    localBankDraft.value = { ...localBankDraft.value, author: "新作者" };
    await nextTick();
    api.flushAutosave();
    expect(upsertMock).toHaveBeenCalledTimes(1);

    upsertMock.mockClear();
    vi.advanceTimersByTime(2000);
    expect(upsertMock).not.toHaveBeenCalled();

    scope.stop();
  });

  it("calls onAutosaveError when upsert fails", () => {
    const onAutosaveError = vi.fn();
    upsertMock.mockReturnValue({
      ok: false,
      message: "配额不足",
      banks: []
    } satisfies UpsertEditorDraftResult);

    const { scope, api } = runAutosave({ onAutosaveError });
    api.flushAutosave();

    expect(onAutosaveError).toHaveBeenCalledWith("配额不足");
    expect(replaceMock).not.toHaveBeenCalled();

    scope.stop();
  });

  it("flushes pending save when effect scope is disposed", async () => {
    upsertMock.mockReturnValue(okResult("local-1"));

    const { scope, localBankDraft } = runAutosave({
      editingBankId: "local-1",
      resolveBankId: () => "local-1"
    });

    localBankDraft.value = { ...localBankDraft.value, subject: "新类型" };
    await nextTick();
    expect(upsertMock).not.toHaveBeenCalled();

    scope.stop();
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});
