import { describe, expect, it } from "vitest";
import {
  allAnswerNumber,
  buildQuestionsFromTxt,
  getAnswerSlotCount,
  getQuestionType,
  judgeAnswerTrue,
  judgeSlotOutcome,
  numberToPercent,
  trueAnswerNumber
} from "./questions.ts";

describe("questions utils", () => {
  it("buildQuestionsFromTxt builds fill-in questions", () => {
    const txts = [{ txt: "1+1=_2_", MD5: false, image: "" }];
    const built = buildQuestionsFromTxt(txts, []);
    expect(built).toHaveLength(1);
    expect(built[0].answers[0]).toEqual(["2"]);
    expect(getQuestionType(built[0])).toBe("fillBlank");
  });

  it("buildQuestionsFromTxt merges when second arg non-empty, replaces when empty", () => {
    const first = buildQuestionsFromTxt([{ txt: "a=_1_", MD5: false, image: "" }], []);
    const merged = buildQuestionsFromTxt([{ txt: "b=_2_", MD5: false, image: "" }], first);
    expect(merged).toHaveLength(2);
    const replaced = buildQuestionsFromTxt([{ txt: "c=_3_", MD5: false, image: "" }], []);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].answers[0]).toEqual(["3"]);
  });

  it("judgeAnswerTrue compares plain answers", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["1+1=", "2", ""],
      answers: [["2"]],
      results: ["2"],
      MD5: false,
      image: ""
    };
    expect(judgeAnswerTrue(question, 0)).toBe(true);
  });

  it("judgeAnswerTrue works for singleChoice letter answers", () => {
    const question = {
      questionType: "singleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" }
      ],
      answers: [["B", "b"]],
      results: ["B"],
      MD5: false,
      image: ""
    };
    expect(judgeAnswerTrue(question, 0)).toBe(true);
  });

  it("judgeAnswerTrue requires all selected keys for multipleChoice", () => {
    const question = {
      questionType: "multipleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" },
        { key: "C", text: "选项C" }
      ],
      answers: [["A", "C"]],
      results: ["A,C"],
      MD5: false,
      image: ""
    };
    expect(judgeAnswerTrue(question, 0)).toBe(true);
    question.results[0] = "A";
    expect(judgeAnswerTrue(question, 0)).toBe(false);
    question.results[0] = "A,B";
    expect(judgeAnswerTrue(question, 0)).toBe(false);
  });

  it("judgeSlotOutcome distinguishes correct, partial, and wrong for multipleChoice", () => {
    const question = {
      questionType: "multipleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" },
        { key: "C", text: "选项C" }
      ],
      answers: [["A", "C"]],
      results: ["A,C"],
      MD5: false,
      image: ""
    };
    expect(judgeSlotOutcome(question, 0)).toBe("correct");
    question.results[0] = "A";
    expect(judgeSlotOutcome(question, 0)).toBe("partial");
    question.results[0] = "A,B";
    expect(judgeSlotOutcome(question, 0)).toBe("wrong");
    question.results[0] = "A,B,C";
    expect(judgeSlotOutcome(question, 0)).toBe("wrong");
    question.results[0] = "B";
    expect(judgeSlotOutcome(question, 0)).toBe("wrong");
  });

  it("getAnswerSlotCount and allAnswerNumber work for singleChoice", () => {
    const question = {
      questionType: "singleChoice",
      stem: "题干",
      options: [{ key: "A", text: "选项A" }],
      answers: [["A"]],
      results: [undefined],
      MD5: false,
      image: ""
    };
    expect(getAnswerSlotCount(question)).toBe(1);
    expect(allAnswerNumber([question])).toBe(1);
  });

  it("computes progress numbers", () => {
    const questions = [
      {
        questionType: "fillBlank",
        texts: ["a", "2", " b ", "4", ""],
        answers: [["2"], ["4"]],
        results: ["2", "5"],
        MD5: false,
        image: ""
      }
    ];
    expect(trueAnswerNumber(questions)).toBe(1);
    expect(allAnswerNumber(questions)).toBe(2);
    expect(numberToPercent(1, 2)).toBe(50);
  });
});
