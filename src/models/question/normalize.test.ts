import { describe, expect, it } from "vitest";
import { normalizeQuestion, normalizeQuestionWithDetection, usesExtendedQuestionSchema } from "./normalize";

describe("normalizeQuestion", () => {
  it("normalizes legacy fillBlank JSON without questionType", () => {
    const normalized = normalizeQuestion({
      texts: ["1+1=", "2", ""],
      answers: [["2"]],
      answerslength: [20],
      results: [undefined],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType === "singleChoice" || normalized.questionType === undefined).toBe(
      true
    );
    if (normalized.questionType !== "singleChoice" && "texts" in normalized) {
      expect(normalized.texts).toEqual(["1+1=", "2", ""]);
      expect(normalized.answers).toEqual([["2"]]);
    }
  });

  it("normalizes legacy string questions", () => {
    const normalized = normalizeQuestion("plain text question");
    expect(normalized.questionType).toBeUndefined();
    expect("texts" in normalized && normalized.texts).toEqual(["plain text question"]);
    expect(normalized.answers).toEqual([]);
  });

  it("normalizes native singleChoice questions", () => {
    const normalized = normalizeQuestion({
      questionType: "singleChoice",
      stem: "下面正确的字符常量是（  ）。",
      options: [
        { key: "A", text: "\"c\"" },
        { key: "B", text: "\\\\" },
        { key: "C", text: "'W'" },
        { key: "D", text: "''" }
      ],
      answers: [["C", "c"]],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).toBe("singleChoice");
    if (normalized.questionType === "singleChoice") {
      expect(normalized.stem).toContain("字符常量");
      expect(normalized.options).toHaveLength(4);
      expect(normalized.results).toHaveLength(1);
    }
  });

  it("keeps 0.0.2 pseudo-choice as fillBlank by default", () => {
    const normalized = normalizeQuestion({
      texts: [
        "下面正确的字符常量是",
        "c,C",
        "。\nA. \"c\"\nB. \"\\\\\"\nC. 'W'\nD. ''"
      ],
      answers: [["c", "C"]],
      answerslength: [34],
      results: [undefined],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).not.toBe("singleChoice");
    expect("texts" in normalized && normalized.texts).toBeDefined();
  });

  it("can upgrade pseudo-choice with normalizeQuestionWithDetection", () => {
    const normalized = normalizeQuestionWithDetection({
      texts: [
        "下面正确的字符常量是",
        "c,C",
        "。\nA. \"c\"\nB. \"\\\\\"\nC. 'W'\nD. ''"
      ],
      answers: [["c", "C"]],
      answerslength: [34],
      results: [undefined],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).toBe("singleChoice");
  });

  it("normalizes multipleChoice questions with stem and options", () => {
    const normalized = normalizeQuestion({
      questionType: "multiChoice",
      stem: "多选题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" }
      ],
      answers: [["A", "B"]],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).toBe("multipleChoice");
    if (normalized.questionType === "multipleChoice") {
      expect(normalized.stem).toBe("多选题干");
      expect(normalized.options).toHaveLength(2);
    }
  });

  it("normalizes judgment questions", () => {
    const normalized = normalizeQuestion({
      questionType: "judgment",
      stem: "判断题干",
      options: [
        { key: "A", text: "正确" },
        { key: "B", text: "错误" }
      ],
      answers: [["A"]],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).toBe("judgment");
    if (normalized.questionType === "judgment") {
      expect(normalized.stem).toBe("判断题干");
      expect(normalized.options).toHaveLength(2);
    }
  });

  it("maps legacy trueFalse alias to judgment", () => {
    const normalized = normalizeQuestion({
      questionType: "trueFalse",
      stem: "判断题干",
      options: [
        { key: "A", text: "正确" },
        { key: "B", text: "错误" }
      ],
      answers: [["A"]],
      MD5: false,
      image: ""
    });

    expect(normalized.questionType).toBe("judgment");
  });
});

describe("usesExtendedQuestionSchema", () => {
  it("returns false for pure fillBlank questions", () => {
    expect(
      usesExtendedQuestionSchema([
        {
          texts: ["a", "b", ""],
          answers: [["b"]]
        }
      ])
    ).toBe(false);
  });

  it("returns true when singleChoice fields exist", () => {
    expect(
      usesExtendedQuestionSchema([
        {
          questionType: "singleChoice",
          stem: "题干",
          options: [{ key: "A", text: "选项A" }],
          answers: [["A"]]
        }
      ])
    ).toBe(true);
  });
});
