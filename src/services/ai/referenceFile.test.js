import { describe, expect, it } from "vitest";
import {
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_TOTAL_CHARS,
  addReferenceFiles,
  formatUserMessageWithReferences,
  isReferenceFile
} from "./referenceFile.js";

function createMockFile(name, content, type = "text/plain") {
  return {
    name,
    type,
    size: content.length
  };
}

describe("referenceFile helpers", () => {
  it("accepts common text extensions and mime types", () => {
    expect(isReferenceFile(createMockFile("notes.txt", "a"))).toBe(true);
    expect(isReferenceFile(createMockFile("readme.md", "a", "text/markdown"))).toBe(true);
    expect(isReferenceFile(createMockFile("data.json", "{}", "application/json"))).toBe(true);
    expect(isReferenceFile(createMockFile("sheet.csv", "a,b", "text/csv"))).toBe(true);
    expect(isReferenceFile(createMockFile("doc.pdf", "a", "application/pdf"))).toBe(false);
  });

  it("reads and merges reference files", async () => {
    const originalReader = globalThis.FileReader;

    class MockFileReader {
      readAsText() {
        this.result = "chapter content";
        this.onload?.();
      }
    }

    globalThis.FileReader = MockFileReader;

    try {
      const result = await addReferenceFiles([], [createMockFile("chapter.txt", "chapter content")]);
      expect(result.ok).toBe(true);
      expect(result.files).toEqual([
        {
          name: "chapter.txt",
          content: "chapter content",
          size: "chapter content".length
        }
      ]);
    } finally {
      globalThis.FileReader = originalReader;
    }
  });

  it("replaces files with the same name", async () => {
    const originalReader = globalThis.FileReader;

    class MockFileReader {
      constructor() {
        this.fileName = "";
      }

      readAsText(file) {
        this.result = `${file.name}-content`;
        this.onload?.();
      }
    }

    globalThis.FileReader = MockFileReader;

    try {
      const existing = [{ name: "notes.txt", content: "old", size: 3 }];
      const result = await addReferenceFiles(existing, [createMockFile("notes.txt", "new")]);

      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].content).toBe("notes.txt-content");
    } finally {
      globalThis.FileReader = originalReader;
    }
  });

  it("rejects when total chars exceed limit", async () => {
    const originalReader = globalThis.FileReader;

    class MockFileReader {
      readAsText() {
        this.result = "x".repeat(MAX_REFERENCE_TOTAL_CHARS + 1);
        this.onload?.();
      }
    }

    globalThis.FileReader = MockFileReader;

    try {
      const result = await addReferenceFiles([], [createMockFile("big.txt", "big")]);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("80 KB");
    } finally {
      globalThis.FileReader = originalReader;
    }
  });

  it("rejects when file count exceeds limit", async () => {
    const existing = Array.from({ length: MAX_REFERENCE_FILES }, (_, index) => ({
      name: `file-${index}.txt`,
      content: "a",
      size: 1
    }));

    const result = await addReferenceFiles(existing, [createMockFile("extra.txt", "a")]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain(String(MAX_REFERENCE_FILES));
  });

  it("formats user message with reference names", () => {
    expect(formatUserMessageWithReferences("生成 5 题", [])).toBe("生成 5 题");
    expect(
      formatUserMessageWithReferences("生成 5 题", [
        { name: "a.txt", content: "A", size: 1 },
        { name: "b.md", content: "B", size: 1 }
      ])
    ).toBe("生成 5 题\n\n📎 参考：a.txt、b.md");
  });
});
