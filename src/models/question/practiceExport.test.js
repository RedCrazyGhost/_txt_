import { describe, expect, it } from "vitest";
import {
  buildPracticeRecordExportJson,
  buildPracticeRecordSet,
  getAttemptedQuestions
} from "./practiceExport.ts";

describe("practiceExport", () => {
  const questions = [
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
  ];

  it("filters attempted questions", () => {
    expect(getAttemptedQuestions(questions)).toHaveLength(1);
  });

  it("exports full practice record with all results", () => {
    const set = buildPracticeRecordSet({ name: "测试题集", type: "法规", author: "作者" }, questions);
    expect(set.name).toBe("测试题集-做题记录");
    expect(set.questions).toHaveLength(2);
    expect(set.questions[0].results[0]).toBe("2");
    expect(set.questions[1].results[0]).toBeFalsy();
  });

  it("exports valid json", () => {
    const json = buildPracticeRecordExportJson({ name: "测试题集" }, questions);
    const parsed = JSON.parse(json);
    expect(parsed.questions).toHaveLength(2);
  });
});
