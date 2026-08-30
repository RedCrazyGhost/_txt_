import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../models/question/types";
import { resumeNotebook } from "./practiceSession";
import {
  NotebookFilter,
  NotebookKind,
  ProgressFilter,
  ProgressStatus,
  __clearAllProgressForTests,
  __writeRawProgressForTests,
  applyProgressToQuestions,
  buildWrongNotebookChildren,
  buildNotebookAncestorChain,
  formatNotebookChainLabel,
  buildProgressRecord,
  buildQuestionsFromCards,
  buildSessionBankId,
  countByStatus,
  createPracticeNotebook,
  createWrongNotebook,
  deriveStatus,
  enrichWithValidity,
  exportPracticeProgressStore,
  getNotebook,
  getProgressRecord,
  importPracticeProgressStore,
  invalidateProgressStoreCache,
  listActionableNotebooks,
  listIncompletePracticeNotebooks,
  listIncompleteRecords,
  listNotebookGroups,
  listNotebooks,
  listNotebooksByBankId,
  listProgressRecords,
  questionFingerprint,
  removeProgressRecord,
  saveProgressRecord,
  patchProgressRecord
} from "./practiceProgress";

const sampleQuestions = [
  {
    questionType: "fillBlank",
    texts: ["a", "2", ""],
    answers: [["2"]],
    results: ["2"],
    MD5: false,
    image: ""
  },
  {
    questionType: "fillBlank",
    texts: ["b", "3", ""],
    answers: [["3"]],
    results: [undefined],
    MD5: false,
    image: ""
  }
] as Question[];

const storage: Record<string, string> = {};

function createLocalStorageMock() {
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: unknown) => {
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }
  };
}

describe("practiceProgress", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent<T = unknown> {
        type: string;
        detail?: T;
        constructor(type: string, init: { detail?: T } = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      }
    );
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
    __clearAllProgressForTests();
  });

  it("builds stable session bank id", () => {
    const meta = { name: "测试", type: "法规", author: "作者", version: "0.0.2" };
    const id1 = buildSessionBankId(meta, sampleQuestions);
    const id2 = buildSessionBankId(meta, sampleQuestions);
    expect(id1).toBe(id2);
    expect(id1.startsWith("session-")).toBe(true);
  });

  it("saves and loads progress records by notebook id", () => {
    const record = buildProgressRecord(
      { bankId: "local-1", bankSource: "local", name: "测试题集" },
      sampleQuestions
    );
    saveProgressRecord(record);
    const loaded = getProgressRecord(record.notebookId);
    expect(loaded?.name).toBe("测试题集");
    expect(loaded?.results[0][0]).toBe("2");
    expect(listNotebooksByBankId("local-1")).toHaveLength(1);
  });

  it("dispatches storage changed event when saving progress", () => {
    const record = buildProgressRecord(
      { bankId: "local-notify", bankSource: "local", name: "通知测试" },
      sampleQuestions
    );
    saveProgressRecord(record);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    const event = vi.mocked(window.dispatchEvent).mock.calls[0]![0] as CustomEvent<{ kind: string }>;
    expect(event.detail.kind).toBe("practiceProgress");
  });

  it("removes progress records", () => {
    const record = buildProgressRecord(
      { bankId: "local-2", bankSource: "local", name: "删除测试" },
      sampleQuestions
    );
    saveProgressRecord(record);
    removeProgressRecord(record.notebookId);
    expect(getProgressRecord(record.notebookId)).toBeNull();
  });

  it("keeps multiple notebooks for the same bank", () => {
    const first = buildProgressRecord(
      { bankId: "same-bank", bankSource: "local", name: "第一本" },
      sampleQuestions
    );
    const second = buildProgressRecord(
      { bankId: "same-bank", bankSource: "local", name: "第二本" },
      sampleQuestions
    );
    saveProgressRecord(first);
    saveProgressRecord(second);
    expect(listNotebooksByBankId("same-bank")).toHaveLength(2);
    expect(getProgressRecord(first.notebookId)?.name).toBe("第一本");
    expect(getProgressRecord(second.notebookId)?.name).toBe("第二本");
  });

  it("applies saved results to questions", () => {
    const questions = JSON.parse(JSON.stringify(sampleQuestions)) as Question[];
    questions[1]!.results![0] = undefined;
    const record = buildProgressRecord(
      { bankId: "local-3", bankSource: "local", name: "恢复测试" },
      sampleQuestions
    );
    record.results[1] = ["3"];
    const ok = applyProgressToQuestions(questions, record);
    expect(ok).toBe(true);
    expect(questions[1]!.results![0]).toBe("3");
  });

  it("derives inProgress and completed status", () => {
    const inProgress = buildProgressRecord(
      { bankId: "s1", bankSource: "local", name: "进行中" },
      sampleQuestions
    );
    expect(deriveStatus(inProgress)).toBe(ProgressStatus.IN_PROGRESS);

    const completedQuestions = JSON.parse(JSON.stringify(sampleQuestions)) as Question[];
    completedQuestions[1]!.results![0] = "3";
    const completed = buildProgressRecord(
      { bankId: "s2", bankSource: "local", name: "已完成" },
      completedQuestions
    );
    expect(deriveStatus(completed)).toBe(ProgressStatus.COMPLETED);
  });

  it("marks bank-backed records invalid when bank missing", () => {
    const record = buildProgressRecord(
      { bankId: "missing-bank", bankSource: "local", name: "失效" },
      sampleQuestions
    );
    const enriched = enrichWithValidity(record, []);
    expect(enriched?.invalidReason).toBe("bankMissing");
    expect(deriveStatus(enriched!)).toBe(ProgressStatus.INVALID);
  });

  it("keeps bank-backed records valid when bank missing but snapshot exists", () => {
    const record = buildProgressRecord(
      { bankId: "missing-bank", bankSource: "local", name: "可恢复" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    const enriched = enrichWithValidity(record, []);
    expect(enriched?.invalidReason).toBeUndefined();
    expect(deriveStatus(enriched!)).toBe(ProgressStatus.IN_PROGRESS);
  });

  it("resume works when bank missing but checkpoint has snapshot", () => {
    const record = buildProgressRecord(
      { bankId: "gone-bank", bankSource: "local", name: "离线题集" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    saveProgressRecord(record);
    const notebook = getNotebook(record.notebookId);
    expect(notebook).toBeTruthy();
    if (!notebook) return;

    expect(resumeNotebook(notebook, [])).toBe(true);
  });

  it("filters records by status", () => {
    saveProgressRecord(
      buildProgressRecord({ bankId: "a", bankSource: "local", name: "进行中" }, sampleQuestions)
    );
    const completedQuestions = JSON.parse(JSON.stringify(sampleQuestions)) as Question[];
    completedQuestions[1]!.results![0] = "3";
    saveProgressRecord(
      buildProgressRecord({ bankId: "b", bankSource: "local", name: "已完成" }, completedQuestions)
    );

    const banks = [
      { id: "a", questions: sampleQuestions },
      { id: "b", questions: completedQuestions }
    ];

    const all = listProgressRecords({ filter: ProgressFilter.ALL }, banks);
    expect(all).toHaveLength(2);

    const incomplete = listIncompleteRecords(banks);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]!.bankId).toBe("a");

    const counts = countByStatus(all);
    expect(counts.inProgress).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("stores session question snapshot when requested", () => {
    const record = buildProgressRecord(
      { bankId: "session-1", bankSource: "session", name: "首页" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    expect(record.questions).toHaveLength(2);
    expect(enrichWithValidity(record, [])?.invalidReason).toBeUndefined();
  });

  it("reuses existing session questions snapshot when saving without a new one", () => {
    const withSnapshot = buildProgressRecord(
      { bankId: "session-reuse", bankSource: "session", name: "首页" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    saveProgressRecord(withSnapshot);
    const firstQuestions = getProgressRecord(withSnapshot.notebookId)?.questions;
    expect(firstQuestions).toHaveLength(2);

    const withoutSnapshot = buildProgressRecord(
      {
        notebookId: withSnapshot.notebookId,
        bankId: "session-reuse",
        bankSource: "session",
        name: "首页"
      },
      sampleQuestions,
      { includeQuestionsSnapshot: false }
    );
    withoutSnapshot.results[1] = ["3"];
    saveProgressRecord(withoutSnapshot);

    const loaded = getProgressRecord(withSnapshot.notebookId);
    expect(loaded?.results[1]?.[0]).toBe("3");
    expect(loaded?.questions).toBe(firstQuestions);
  });

  it("patches a single question row without dropping other results or snapshot", () => {
    const withSnapshot = buildProgressRecord(
      { bankId: "session-patch", bankSource: "session", name: "首页" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    saveProgressRecord(withSnapshot);
    const snapshot = getProgressRecord(withSnapshot.notebookId)?.questions;

    const patchedQuestion = {
      ...sampleQuestions[1],
      results: ["3"]
    } as Question;

    const ok = patchProgressRecord({
      notebookId: withSnapshot.notebookId,
      bankId: "session-patch",
      bankSource: "session",
      name: "首页",
      questionIndex: 1,
      question: patchedQuestion,
      questionCount: 2,
      stats: {
        totalQuestions: 2,
        attemptedQuestions: 2,
        fullyCorrectQuestions: 2,
        totalSlots: 2,
        attemptedSlots: 2,
        correctSlots: 2,
        partialSlots: 0,
        wrongSlots: 0,
        unansweredSlots: 0
      }
    });

    expect(ok).toBe(true);
    const loaded = getProgressRecord(withSnapshot.notebookId);
    expect(loaded?.results[0]?.[0]).toBe("2");
    expect(loaded?.results[1]?.[0]).toBe("3");
    expect(loaded?.questions).toBe(snapshot);
    expect(loaded?.stats.attemptedQuestions).toBe(2);

    const restored = [...sampleQuestions];
    restored[1] = { ...restored[1], results: [] };
    expect(applyProgressToQuestions(restored, loaded!)).toBe(true);
    expect(restored[1].results?.[0]).toBe("3");
  });

  it("returns false when patching a notebook with no prior record", () => {
    expect(
      patchProgressRecord({
        notebookId: "missing",
        bankId: "missing",
        questionIndex: 0,
        question: sampleQuestions[0],
        questionCount: 1,
        stats: {
          totalQuestions: 1,
          attemptedQuestions: 0,
          fullyCorrectQuestions: 0,
          totalSlots: 1,
          attemptedSlots: 0,
          correctSlots: 0,
          partialSlots: 0,
          wrongSlots: 0,
          unansweredSlots: 1
        }
      })
    ).toBe(false);
  });

  it("caches parsed progress store between reads", () => {
    const record = buildProgressRecord(
      { bankId: "cache-1", bankSource: "local", name: "缓存" },
      sampleQuestions
    );
    saveProgressRecord(record);

    const getItem = vi.spyOn(window.localStorage, "getItem");
    getProgressRecord(record.notebookId);
    getProgressRecord(record.notebookId);
    listProgressRecords({ filter: ProgressFilter.ALL }, [{ id: "cache-1", questions: sampleQuestions }]);

    expect(getItem).not.toHaveBeenCalled();
  });

  it("invalidates cache so subsequent reads hit localStorage again", () => {
    const record = buildProgressRecord(
      { bankId: "cache-2", bankSource: "local", name: "失效" },
      sampleQuestions
    );
    saveProgressRecord(record);
    getProgressRecord(record.notebookId);

    invalidateProgressStoreCache();
    const getItem = vi.spyOn(window.localStorage, "getItem");
    getProgressRecord(record.notebookId);
    expect(getItem).toHaveBeenCalled();
  });

  it("migrates v1 records into practice notebooks", () => {
    const v1 = {
      schemaVersion: 1,
      records: {
        "legacy-1": {
          bankId: "legacy-1",
          bankSource: "local",
          name: "旧进度",
          type: "",
          author: "",
          version: "0.0.2",
          questionCount: 2,
          updatedAt: "2024-01-01T00:00:00.000Z",
          results: [["2"], [undefined]],
          stats: {
            totalQuestions: 2,
            attemptedQuestions: 1,
            fullyCorrectQuestions: 1,
            totalSlots: 2,
            attemptedSlots: 1,
            correctSlots: 1,
            partialSlots: 0,
            wrongSlots: 0,
            unansweredSlots: 1
          }
        }
      }
    };
    __writeRawProgressForTests(JSON.stringify(v1));
    invalidateProgressStoreCache();

    const record = getProgressRecord("nb-migrated-legacy-1");
    expect(record?.name).toBe("旧进度");
    expect(record?.results[0]?.[0]).toBe("2");
    expect(getNotebook("nb-migrated-legacy-1")?.kind).toBe(NotebookKind.PRACTICE);
  });

  it("migrates v2 wrong cards into a wrong notebook", () => {
    const v2 = {
      schemaVersion: 2,
      workspaces: {
        "card-bank": {
          bankId: "card-bank",
          bankSource: "session",
          name: "卡片",
          type: "",
          author: "",
          version: "0.0.2",
          questionCount: 2,
          updatedAt: "2026-07-22T10:00:00.000Z",
          checkpoint: {
            results: [["2"], ["9"]],
            stats: {
              totalQuestions: 2,
              attemptedQuestions: 2,
              fullyCorrectQuestions: 1,
              totalSlots: 2,
              attemptedSlots: 2,
              correctSlots: 1,
              partialSlots: 0,
              wrongSlots: 1,
              unansweredSlots: 0
            },
            updatedAt: "2026-07-22T10:00:00.000Z",
            questions: sampleQuestions
          },
          cards: {
            q1: {
              questionKey: "q1",
              questionIndex: 1,
              fingerprint: questionFingerprint(sampleQuestions[1]),
              wrongCount: 1,
              attemptCount: 1,
              correctStreak: 0,
              lastOutcome: "wrong",
              lastAttemptAt: "2026-07-22T10:00:00.000Z",
              intervalDays: 0,
              dueAt: "2026-07-22T00:00:00.000Z",
              status: "learning"
            }
          }
        }
      }
    };
    __writeRawProgressForTests(JSON.stringify(v2));
    invalidateProgressStoreCache();

    const practice = getNotebook("nb-migrated-card-bank");
    const wrong = getNotebook("nb-migrated-wrong-card-bank");
    expect(practice?.checkpoint.results[0]?.[0]).toBe("2");
    expect(wrong?.kind).toBe(NotebookKind.WRONG);
    expect(wrong?.parentNotebookId).toBe(practice?.id);
    expect(wrong?.checkpoint.questions).toHaveLength(1);
  });

  it("creates a wrong notebook from a practice notebook", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "wrong-src", bankSource: "session", name: "原题集" },
      withWrong,
      { includeQuestionsSnapshot: true }
    );
    const created = createWrongNotebook(parent, {
      sourceQuestions: withWrong
    });
    expect(created?.kind).toBe(NotebookKind.WRONG);
    expect(created?.parentNotebookId).toBe(parent.id);
    expect(created?.checkpoint.questions).toHaveLength(1);
    expect(created?.name).toContain("错题");
    expect(getProgressRecord(parent.id)?.results[0]?.[0]).toBe("2");
  });

  it("creates a new wrong notebook on each call from the same parent", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "multi-wrong", bankSource: "local", name: "多错题本" },
      withWrong
    );
    const first = createWrongNotebook(parent, { sourceQuestions: withWrong });
    const second = createWrongNotebook(parent, { sourceQuestions: withWrong });
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);
  });

  it("lists multiple wrong notebooks under the same practice notebook", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "multi-list", bankSource: "local", name: "多错题本列表" },
      withWrong
    );
    createWrongNotebook(parent, { sourceQuestions: withWrong });
    createWrongNotebook(parent, { sourceQuestions: withWrong });
    const groups = listNotebookGroups(
      { filter: NotebookFilter.ALL },
      [{ id: "multi-list", questions: sampleQuestions }]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.notebooks[0]!.children).toHaveLength(2);
  });

  it("does not list nested wrong notebooks as separate orphan roots", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "orphan-chain", bankSource: "local", name: "孤儿链题库" },
      withWrong
    );
    const firstWrong = createWrongNotebook(parent, { sourceQuestions: withWrong });
    const withWrongAgain = [
      { ...withWrong[0], results: ["9"] },
      { ...withWrong[1], results: ["8"] }
    ] as Question[];
    patchProgressRecord(firstWrong!.id, withWrongAgain);
    const secondWrong = createWrongNotebook(getNotebook(firstWrong!.id)!, {
      sourceQuestions: withWrongAgain
    });

    const groups = listNotebookGroups(
      { filter: NotebookFilter.ALL },
      [{ id: "orphan-chain", questions: sampleQuestions }]
    );
    const orphanIds = groups[0]!.orphanWrongNotebooks.map((item) => item.id);
    expect(orphanIds).not.toContain(secondWrong!.id);
    expect(groups[0]!.notebooks[0]!.children).toHaveLength(2);
    expect(groups[0]!.notebooks[0]!.children.every((item) => item.children.length === 0)).toBe(
      true
    );
  });

  it("lists actionable incomplete notebooks for nav badge", () => {
    saveProgressRecord(
      buildProgressRecord({ bankId: "nav-a", bankSource: "local", name: "进行中" }, sampleQuestions)
    );
    const completedQuestions = JSON.parse(JSON.stringify(sampleQuestions)) as Question[];
    completedQuestions[1]!.results![0] = "3";
    saveProgressRecord(
      buildProgressRecord({ bankId: "nav-b", bankSource: "local", name: "已完成" }, completedQuestions)
    );

    const banks = [
      { id: "nav-a", questions: sampleQuestions },
      { id: "nav-b", questions: completedQuestions }
    ];
    const actionable = listActionableNotebooks(banks);
    expect(actionable.map((item) => item.bankId)).toEqual(["nav-a"]);
  });

  it("groups notebooks by bank and nests wrong notebooks", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "group-1", bankSource: "local", name: "分组题库", type: "数学" },
      withWrong
    );
    createWrongNotebook(parent, { sourceQuestions: withWrong });
    const groups = listNotebookGroups(
      { filter: NotebookFilter.ALL },
      [{ id: "group-1", questions: sampleQuestions }]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe("分组题库");
    expect(groups[0]!.notebooks).toHaveLength(1);
    expect(groups[0]!.notebooks[0]!.children).toHaveLength(1);
  });

  it("mounts wrong notebooks as siblings under the practice root", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "chain-1", bankSource: "local", name: "链式题库", type: "数学" },
      withWrong
    );
    const firstWrong = createWrongNotebook(parent, { sourceQuestions: withWrong });
    expect(firstWrong).not.toBeNull();
    expect(firstWrong!.parentNotebookId).toBe(parent.id);
    const withWrongAgain = [
      { ...withWrong[0], results: ["9"] },
      { ...withWrong[1], results: ["8"] }
    ] as Question[];
    patchProgressRecord(firstWrong!.id, withWrongAgain);
    const secondWrong = createWrongNotebook(getNotebook(firstWrong!.id)!, {
      sourceQuestions: withWrongAgain
    });
    expect(secondWrong).not.toBeNull();
    expect(secondWrong!.parentNotebookId).toBe(parent.id);
    expect(secondWrong!.parentNotebookId).not.toBe(firstWrong!.id);

    const groups = listNotebookGroups(
      { filter: NotebookFilter.ALL },
      [{ id: "chain-1", questions: sampleQuestions }]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.notebooks).toHaveLength(1);
    expect(groups[0]!.notebooks[0]!.children).toHaveLength(2);
    expect(groups[0]!.notebooks[0]!.children.every((item) => item.children.length === 0)).toBe(
      true
    );
    expect(groups[0]!.notebooks[0]!.children.map((item) => item.id).sort()).toEqual(
      [firstWrong!.id, secondWrong!.id].sort()
    );
  });

  it("includes sibling wrong notebooks when one matches filter", () => {
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const parent = createPracticeNotebook(
      { bankId: "chain-filter", bankSource: "local", name: "链式筛选题库" },
      withWrong
    );
    const firstWrong = createWrongNotebook(parent, { sourceQuestions: withWrong });
    const withWrongAgain = [
      { ...withWrong[0], results: ["9"] },
      { ...withWrong[1], results: ["8"] }
    ] as Question[];
    patchProgressRecord(firstWrong!.id, withWrongAgain);
    const secondWrong = createWrongNotebook(getNotebook(firstWrong!.id)!, {
      sourceQuestions: withWrongAgain
    });
    patchProgressRecord(secondWrong!.id, withWrongAgain);

    const banks = [{ id: "chain-filter", questions: sampleQuestions }];
    const allNotebooks = listNotebooks({ filter: NotebookFilter.ALL }, banks);
    const filteredIds = new Set([secondWrong!.id]);
    const children = buildWrongNotebookChildren(parent.id, allNotebooks, filteredIds);
    expect(children).toHaveLength(1);
    expect(children[0]!.id).toBe(secondWrong!.id);
    expect(children[0]!.children).toHaveLength(0);
  });

  it("builds ancestor chain from parentNotebookId", () => {
    const practice = createPracticeNotebook(
      { bankId: "chain-meta", bankSource: "local", name: "链式元数据题库" },
      sampleQuestions
    );
    const withWrong = [
      sampleQuestions[0],
      { ...sampleQuestions[1], results: ["9"] }
    ] as Question[];
    const firstWrong = createWrongNotebook(practice, { sourceQuestions: withWrong });
    const all = listNotebooks({ filter: NotebookFilter.ALL }, [{ id: "chain-meta", questions: sampleQuestions }]);
    const byId = new Map(all.map((item) => [item.id, item]));
    const chain = buildNotebookAncestorChain(getNotebook(firstWrong!.id)! as typeof all[number], byId);
    expect(chain).toHaveLength(1);
    expect(chain[0]!.id).toBe(practice.id);
    expect(formatNotebookChainLabel(chain[0]!)).toContain("做题本");
    expect(formatNotebookChainLabel(chain[0]!)).toContain("进度");
  });

  it("aggregates notebooks with the same bank name into one group", () => {
    saveProgressRecord(
      buildProgressRecord(
        { bankId: "session-same", bankSource: "session", name: "两类人员考核 · 专业部分题库" },
        sampleQuestions,
        { includeQuestionsSnapshot: true }
      )
    );
    saveProgressRecord(
      buildProgressRecord(
        { bankId: "remote-same", bankSource: "remote", name: "两类人员考核 · 专业部分题库" },
        sampleQuestions
      )
    );
    const groups = listNotebookGroups(
      { filter: NotebookFilter.ALL },
      [{ id: "remote-same", questions: sampleQuestions }]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe("两类人员考核 · 专业部分题库");
    expect(groups[0]!.notebooks).toHaveLength(2);
    expect(groups[0]!.sources.sort()).toEqual(["remote", "session"]);
  });

  it("lists incomplete practice notebooks for a bank", () => {
    saveProgressRecord(
      buildProgressRecord({ bankId: "open-1", bankSource: "local", name: "进行中" }, sampleQuestions)
    );
    const banks = [{ id: "open-1", questions: sampleQuestions }];
    expect(listIncompletePracticeNotebooks("open-1", banks)).toHaveLength(1);
    expect(listIncompletePracticeNotebooks("other", banks)).toHaveLength(0);
  });

  it("builds practice questions from cards by fingerprint", () => {
    const built = buildQuestionsFromCards(
      [{ questionIndex: 1, fingerprint: questionFingerprint(sampleQuestions[1]) }],
      sampleQuestions
    );
    expect(built).toHaveLength(1);
    expect(questionFingerprint(built[0]!)).toBe(questionFingerprint(sampleQuestions[1]!));
    expect(built[0]!.results?.[0]).toBeUndefined();
  });

  it("exports and imports practice progress store", () => {
    createPracticeNotebook(
      { bankId: "backup-1", bankSource: "local", name: "备份题集" },
      sampleQuestions,
      { includeQuestionsSnapshot: true }
    );
    const exported = exportPracticeProgressStore();
    const parsed = JSON.parse(exported) as { schemaVersion: number; notebooks: Record<string, unknown> };
    expect(parsed.schemaVersion).toBe(3);
    expect(Object.keys(parsed.notebooks)).toHaveLength(1);

    __clearAllProgressForTests();
    expect(listNotebooks()).toHaveLength(0);

    const result = importPracticeProgressStore(exported);
    expect(result.ok).toBe(true);
    expect(listNotebooks()).toHaveLength(1);
    expect(listNotebooks()[0]!.name).toBe("备份题集");
  });

  it("rejects invalid import payload without clearing existing data", () => {
    createPracticeNotebook(
      { bankId: "keep-1", bankSource: "local", name: "应保留" },
      sampleQuestions
    );
    expect(listNotebooks()).toHaveLength(1);

    expect(importPracticeProgressStore("not-json").ok).toBe(false);
    expect(importPracticeProgressStore("{}").ok).toBe(false);
    expect(importPracticeProgressStore(JSON.stringify({ schemaVersion: 3 })).ok).toBe(false);
    expect(
      importPracticeProgressStore(
        JSON.stringify({
          schemaVersion: 3,
          notebooks: { bad: { id: "bad", name: "缺字段" } }
        })
      ).ok
    ).toBe(false);

    expect(listNotebooks()).toHaveLength(1);
    expect(listNotebooks()[0]!.name).toBe("应保留");
  });
});
