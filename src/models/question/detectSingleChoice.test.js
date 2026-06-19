import { describe, expect, it } from "vitest";
import { detectSingleChoiceFromFillBlank } from "./detectSingleChoice";

describe("detectSingleChoiceFromFillBlank", () => {
  it("detects C language pseudo-choice questions", () => {
    const question = {
      questionType: "fillBlank",
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
    };

    const detected = detectSingleChoiceFromFillBlank(question);
    expect(detected).not.toBeNull();
    expect(detected?.questionType).toBe("singleChoice");
    expect(detected?.options).toHaveLength(4);
    expect(detected?.options[2]).toEqual({ key: "C", text: "'W'" });
    expect(detected?.stem).toContain("下面正确的字符常量是");
    expect(detected?.stem).toContain("（  ）");
  });

  it("does not detect database fill-in questions", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["数据库管理技术的发展阶段不包括", "操作系统管理阶段", "。"],
      answers: [["操作系统管理阶段"]],
      answerslength: [140],
      results: [undefined],
      MD5: false,
      image: ""
    };

    expect(detectSingleChoiceFromFillBlank(question)).toBeNull();
  });

  it("does not detect multi-blank questions", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["在C语言中，& 表示", "取地址运算符", "，双目表示", "按位与运算符", "。"],
      answers: [["取地址运算符"], ["按位与运算符"]],
      answerslength: [100, 100],
      results: [undefined, undefined],
      MD5: false,
      image: ""
    };

    expect(detectSingleChoiceFromFillBlank(question)).toBeNull();
  });

  it("does not detect when answer is not a single letter", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["以下说法正确的是(", "c,C", ")\nA. one\nB. two"],
      answers: [["correct answer"]],
      answerslength: [34],
      results: [undefined],
      MD5: false,
      image: ""
    };

    expect(detectSingleChoiceFromFillBlank(question)).toBeNull();
  });
});
