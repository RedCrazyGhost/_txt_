import { describe, expect, it } from "vitest";
import {
  buildQuestionJsonExportFilename,
  buildQuestionJsonPreviewPayload,
  ensureJsonFilename,
  formatYyyymmdd,
  normalizeImportedQuestionJson,
  QUESTION_JSON_VERSION
} from "./questionJsonIo";
import type { Question } from "../models/question/types";

describe("questionJsonIo", () => {
  it("normalizeImportedQuestionJson fills defaults", () => {
    expect(normalizeImportedQuestionJson(null)).toEqual({
      version: QUESTION_JSON_VERSION,
      name: "",
      type: "",
      author: "",
      questions: []
    });
    expect(
      normalizeImportedQuestionJson({
        name: "A",
        type: "B",
        author: "C",
        questions: [{ texts: ["x"], answers: [["y"]] } as Question]
      })
    ).toMatchObject({
      version: QUESTION_JSON_VERSION,
      name: "A",
      type: "B",
      author: "C",
      questions: [{ texts: ["x"], answers: [["y"]] }]
    });
  });

  it("buildQuestionJsonExportFilename uses meta and date", () => {
    const date = new Date(2026, 6, 21);
    expect(buildQuestionJsonExportFilename({ date })).toBe(
      `未命名题集-未分类-佚名-${formatYyyymmdd(date)}.json`
    );
    expect(
      buildQuestionJsonExportFilename({
        name: "高数",
        type: "数学",
        author: "张三",
        date
      })
    ).toBe(`高数-数学-张三-${formatYyyymmdd(date)}.json`);
  });

  it("ensureJsonFilename appends extension", () => {
    expect(ensureJsonFilename("a.json", "fallback.json")).toBe("a.json");
    expect(ensureJsonFilename("a", "fallback.json")).toBe("a.json");
    expect(ensureJsonFilename("  ", "fallback.json")).toBe("fallback.json");
  });

  it("buildQuestionJsonPreviewPayload masks large images", () => {
    const payload = buildQuestionJsonPreviewPayload({
      version: "0.0.2",
      name: "n",
      type: "t",
      author: "a",
      questions: [
        { texts: ["1"], answers: [["a"]], image: "data:big" } as Question,
        { texts: ["2"], answers: [["b"]], image: "" } as Question
      ]
    });
    expect(payload.questions[0].image).toBe("因数据过大，不予显示");
    expect(payload.questions[1].image).toBe("");
  });
});
