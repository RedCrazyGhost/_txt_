import { describe, expect, it } from "vitest";
import {
  NotebookFilter,
  NotebookKind,
  ProgressStatus,
  type BankNotebookGroup,
  type EnrichedNotebook
} from "../services/practiceProgress";
import {
  NOTEBOOK_FILTER_OPTIONS,
  canResumeNotebook,
  filterNotebookGroups
} from "./usePracticeProgressPage";

function makeNotebook(
  overrides: Partial<EnrichedNotebook> & Pick<EnrichedNotebook, "id">
): EnrichedNotebook {
  return {
    id: overrides.id,
    name: overrides.name ?? "测试题库",
    kind: overrides.kind ?? NotebookKind.PRACTICE,
    bankId: overrides.bankId ?? "bank-1",
    questionCount: overrides.questionCount ?? 10,
    createdAt: overrides.createdAt ?? "2026-08-24T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-24T12:00:00.000Z",
    checkpoint: overrides.checkpoint ?? {
      stats: {
        totalQuestions: 10,
        attemptedQuestions: 1,
        fullyCorrectQuestions: 0,
        totalSlots: 100,
        attemptedSlots: 5,
        correctSlots: 4,
        partialSlots: 0,
        wrongSlots: 1,
        unansweredSlots: 95
      },
      results: [],
      updatedAt: overrides.updatedAt ?? "2026-08-24T12:00:00.000Z"
    },
    status: overrides.status ?? ProgressStatus.IN_PROGRESS,
    wrongQuestionCount: overrides.wrongQuestionCount ?? 0,
    wrongWithPartialCount: overrides.wrongWithPartialCount ?? overrides.wrongQuestionCount ?? 0,
    children: overrides.children ?? []
  };
}

function makeGroup(overrides: Partial<BankNotebookGroup> & Pick<BankNotebookGroup, "groupKey">): BankNotebookGroup {
  return {
    groupKey: overrides.groupKey,
    bankId: overrides.bankId ?? "bank-1",
    bankIds: overrides.bankIds ?? ["bank-1"],
    sources: overrides.sources ?? [],
    name: overrides.name ?? "测试题库",
    type: overrides.type ?? "道路运输",
    author: overrides.author ?? "作者甲",
    notebooks: overrides.notebooks ?? [],
    orphanWrongNotebooks: overrides.orphanWrongNotebooks ?? []
  };
}

describe("usePracticeProgressPage helpers", () => {
  it("lets users open notebooks that are not invalid, including not started", () => {
    expect(canResumeNotebook({ status: ProgressStatus.NOT_STARTED })).toBe(true);
    expect(canResumeNotebook({ status: ProgressStatus.IN_PROGRESS })).toBe(true);
    expect(canResumeNotebook({ status: ProgressStatus.COMPLETED })).toBe(true);
    expect(canResumeNotebook({ status: ProgressStatus.INVALID })).toBe(false);
  });

  it("labels the has-wrong filter as 有错题", () => {
    expect(NOTEBOOK_FILTER_OPTIONS.find((item) => item.key === NotebookFilter.HAS_WRONG)?.label).toBe(
      "有错题"
    );
  });
});

describe("filterNotebookGroups", () => {
  const parent = makeNotebook({
    id: "parent-1",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    children: [
      makeNotebook({
        id: "child-1",
        kind: NotebookKind.WRONG,
        createdAt: "2026-02-20T10:00:00.000Z",
        updatedAt: "2026-02-20T10:00:00.000Z"
      })
    ]
  });

  const groups = [
    makeGroup({
      groupKey: "g1",
      name: "两类人员考核题库",
      notebooks: [parent]
    })
  ];

  it("returns the original list when keyword is empty", () => {
    expect(filterNotebookGroups(groups, "")).toEqual(groups);
    expect(filterNotebookGroups(groups, "   ")).toEqual(groups);
  });

  it("filters groups by bank name", () => {
    const result = filterNotebookGroups(groups, "两类人员");
    expect(result).toHaveLength(1);
    expect(result[0].notebooks).toHaveLength(1);
    expect(result[0].notebooks[0].children).toHaveLength(1);
  });

  it("filters notebooks by date substring and keeps parent-child structure", () => {
    const result = filterNotebookGroups(groups, "2026-02-20");
    expect(result).toHaveLength(1);
    expect(result[0].notebooks).toHaveLength(1);
    expect(result[0].notebooks[0].id).toBe("parent-1");
    expect(result[0].notebooks[0].children).toHaveLength(1);
    expect(result[0].notebooks[0].children[0].id).toBe("child-1");
  });

  it("hides groups with no matches", () => {
    expect(filterNotebookGroups(groups, "不存在的关键词")).toEqual([]);
  });

  it("keeps nested wrong notebook chain when filtering deep matches", () => {
    const nestedGroups = [
      makeGroup({
        groupKey: "g2",
        name: "链式题库",
        notebooks: [
          makeNotebook({
            id: "practice-1",
            createdAt: "2026-01-10T10:00:00.000Z",
            updatedAt: "2026-01-10T10:00:00.000Z",
            children: [
              makeNotebook({
                id: "wrong-1",
                kind: NotebookKind.WRONG,
                createdAt: "2026-02-15T10:00:00.000Z",
                updatedAt: "2026-02-15T10:00:00.000Z",
                children: [
                  makeNotebook({
                    id: "wrong-2",
                    kind: NotebookKind.WRONG,
                    createdAt: "2026-03-01T10:00:00.000Z",
                    updatedAt: "2026-03-01T10:00:00.000Z"
                  })
                ]
              })
            ]
          })
        ]
      })
    ];

    const result = filterNotebookGroups(nestedGroups, "2026-03-01");
    expect(result).toHaveLength(1);
    expect(result[0].notebooks[0].children).toHaveLength(1);
    expect(result[0].notebooks[0].children[0].children).toHaveLength(1);
    expect(result[0].notebooks[0].children[0].children[0].id).toBe("wrong-2");
  });
});
