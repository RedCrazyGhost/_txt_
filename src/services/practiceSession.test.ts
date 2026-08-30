import { beforeEach, describe, expect, it, vi } from "vitest";
import { appState } from "../state/appState";
import {
  NotebookKind,
  ProgressStatus,
  __clearAllProgressForTests,
  createPracticeNotebook
} from "./practiceProgress";
import { loadBankIntoPractice, resumeNotebook } from "./practiceSession";

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

describe("practiceSession", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      }
    );
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      dispatchEvent: vi.fn()
    });
    __clearAllProgressForTests();
    appState.questionsJSON = {
      notebookId: "",
      bankId: "",
      bankSource: "",
      version: "0.0.2",
      name: "",
      type: "",
      author: "",
      questions: []
    };
  });

  it("loadBankIntoPractice writes questionsJSON and returns true", () => {
    const ok = loadBankIntoPractice({
      id: "local-1",
      source: "local",
      title: "函数",
      subject: "数学",
      author: "测",
      questions: [{ texts: ["1+1=", ""], answers: [["2"]], image: "", MD5: false }]
    });
    expect(ok).toBe(true);
    expect(appState.questionsJSON.bankId).toBe("local-1");
    expect(appState.questionsJSON.name).toBe("函数");
    expect(appState.questionsJSON.questions).toHaveLength(1);
    expect(appState.questionsJSON.notebookId).toBeTruthy();
  });

  it("loadBankIntoPractice returns false for empty questions", () => {
    expect(loadBankIntoPractice({ id: "x", questions: [] })).toBe(false);
  });

  it("resumeNotebook loads session snapshot questions", () => {
    const notebook = createPracticeNotebook(
      {
        bankId: "session-abc",
        bankSource: "session",
        name: "草稿",
        kind: NotebookKind.PRACTICE
      },
      [{ texts: ["a=", ""], answers: [["1"]], image: "", MD5: false, results: [undefined] }] as never,
      { includeQuestionsSnapshot: true }
    );

    const ok = resumeNotebook({ ...notebook, status: ProgressStatus.IN_PROGRESS } as never, []);
    expect(ok).toBe(true);
    expect(appState.questionsJSON.bankId).toBe("session-abc");
    expect(appState.questionsJSON.name).toBe("草稿");
    expect(appState.questionsJSON.notebookId).toBe(notebook.id);
  });

  it("resumeNotebook opens a not-started wrong notebook from its snapshot", () => {
    const notebook = createPracticeNotebook(
      {
        bankId: "session-wrong",
        bankSource: "session",
        name: "错题复习",
        kind: NotebookKind.WRONG
      },
      [{ texts: ["b=", ""], answers: [["2"]], image: "", MD5: false, results: [undefined] }] as never,
      { includeQuestionsSnapshot: true, emptyResults: true }
    );

    const ok = resumeNotebook({ ...notebook, status: ProgressStatus.NOT_STARTED } as never, []);
    expect(ok).toBe(true);
    expect(appState.questionsJSON.notebookId).toBe(notebook.id);
    expect(appState.questionsJSON.questions).toHaveLength(1);
  });
});
