import { describe, expect, it } from "vitest";
import {
  buildWrongQuestionsExportJson,
  buildWrongQuestionsSet,
  getStrictWrongQuestions,
  getWrongQuestionsIncludingPartial
} from "./wrongQuestions.ts";

describe("wrongQuestions", () => {
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
      results: ["4"],
      MD5: false,
      image: ""
    },
    {
      questionType: "singleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" }
      ],
      answers: [["B"]],
      results: [undefined],
      MD5: false,
      image: ""
    }
  ];

  it("filters questions with any wrong attempt", () => {
    expect(getStrictWrongQuestions(questions)).toHaveLength(1);
    expect(getStrictWrongQuestions(questions)[0].texts[0]).toBe("b");
  });

  it("includes partial multipleChoice when includePartial is enabled", () => {
    const withPartial = [
      ...questions,
      {
        questionType: "multipleChoice",
        stem: "题干",
        options: [
          { key: "A", text: "选项A" },
          { key: "C", text: "选项C" }
        ],
        answers: [["A", "C"]],
        results: ["A"],
        MD5: false,
        image: ""
      }
    ];
    expect(getStrictWrongQuestions(withPartial)).toHaveLength(1);
    expect(getWrongQuestionsIncludingPartial(withPartial)).toHaveLength(2);
  });

  it("builds wrong question set names for strict and partial modes", () => {
    const strictSet = buildWrongQuestionsSet(
      { name: "测试题集", type: "法规", author: "作者" },
      questions
    );
    expect(strictSet.name).toBe("测试题集-错题");

    const partialSet = buildWrongQuestionsSet(
      { name: "测试题集", type: "法规", author: "作者" },
      [
        ...questions,
        {
          questionType: "multipleChoice",
          stem: "题干",
          options: [
            { key: "A", text: "选项A" },
            { key: "C", text: "选项C" }
          ],
          answers: [["A", "C"]],
          results: ["A"],
          MD5: false,
          image: ""
        }
      ],
      { includePartial: true }
    );
    expect(partialSet.name).toBe("测试题集-错题含半对");
    expect(partialSet.questions).toHaveLength(2);
  });

  it("builds wrong question set with answers preserved", () => {
    const set = buildWrongQuestionsSet(
      { name: "测试题集", type: "法规", author: "作者" },
      questions
    );
    expect(set.name).toBe("测试题集-错题");
    expect(set.questions).toHaveLength(1);
    expect(set.questions[0].results[0]).toBe("4");
  });

  it("clears results when preparing retry set", () => {
    const set = buildWrongQuestionsSet(
      { name: "测试题集", type: "法规", author: "作者" },
      questions,
      { clearResults: true }
    );
    expect(set.questions[0].results[0]).toBeUndefined();
  });

  it("exports valid json payload", () => {
    const json = buildWrongQuestionsExportJson({ name: "测试题集" }, questions);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("测试题集-错题");
    expect(parsed.questions).toHaveLength(1);
  });
});
