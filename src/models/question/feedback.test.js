import { describe, expect, it } from "vitest";
import {
  formatCorrectAnswers,
  getAttemptedSlotIndexes,
  getUnansweredQuestionIndexes,
  hasAnyWrongAttempt,
  hasUnansweredSlot,
  isAnswerAttempted,
  shouldShowExplanation
} from "./feedback";

describe("question feedback", () => {
  it("shows explanation when wrong and explanation exists", () => {
    const question = {
      texts: ["a", "b", ""],
      answers: [["b"]],
      results: ["x"],
      explanation: "因为……",
      MD5: false
    };
    expect(hasAnyWrongAttempt(question)).toBe(true);
    expect(shouldShowExplanation(question)).toBe(true);
  });

  it("shows fallback correct answer when wrong without explanation", () => {
    const question = {
      texts: ["a", "b", ""],
      answers: [["b"]],
      results: ["x"],
      MD5: false
    };
    expect(shouldShowExplanation(question)).toBe(true);
    expect(formatCorrectAnswers(question)).toBe("b");
  });

  it("does not show explanation when answer is correct", () => {
    const question = {
      texts: ["a", "b", ""],
      answers: [["b"]],
      results: ["b"],
      explanation: "解析",
      MD5: false
    };
    expect(shouldShowExplanation(question)).toBe(false);
  });

  it("shows explanation when multipleChoice answer is partial", () => {
    const question = {
      questionType: "multipleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "C", text: "选项C" }
      ],
      answers: [["A", "C"]],
      results: ["A"],
      explanation: "解析",
      MD5: false,
      image: ""
    };
    expect(shouldShowExplanation(question)).toBe(true);
  });

  it("treats partial multipleChoice as not wrong", () => {
    const question = {
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
    };
    expect(hasAnyWrongAttempt(question)).toBe(false);
  });

  it("does not treat null results as attempted", () => {
    expect(isAnswerAttempted(null)).toBe(false);
    expect(isAnswerAttempted(undefined)).toBe(false);
    expect(isAnswerAttempted("")).toBe(false);
    expect(isAnswerAttempted("x")).toBe(true);
  });

  it("getAttemptedSlotIndexes skips empty slots", () => {
    const question = {
      texts: ["a", "b", " c ", "d", ""],
      answers: [["b"], ["d"]],
      results: [null, null],
      MD5: false
    };
    expect(getAttemptedSlotIndexes(question)).toEqual([]);
  });

  it("detects unanswered slots and question indexes", () => {
    const questions = [
      {
        texts: ["a", "b", ""],
        answers: [["b"]],
        results: ["b"],
        MD5: false
      },
      {
        texts: ["c", "d", ""],
        answers: [["d"]],
        results: [undefined],
        MD5: false
      },
      {
        texts: ["e", "f", " g ", "h", ""],
        answers: [["f"], ["h"]],
        results: ["f", undefined],
        MD5: false
      }
    ];
    expect(hasUnansweredSlot(questions[0])).toBe(false);
    expect(hasUnansweredSlot(questions[1])).toBe(true);
    expect(hasUnansweredSlot(questions[2])).toBe(true);
    expect(getUnansweredQuestionIndexes(questions)).toEqual([1, 2]);
  });
});
