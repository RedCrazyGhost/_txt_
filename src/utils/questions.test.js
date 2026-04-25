import { describe, expect, it } from "vitest";
import {
  allAnswerNumber,
  buildQuestionsFromTxt,
  judgeAnswerTrue,
  numberToPercent,
  trueAnswerNumber
} from "./questions.ts";

describe("questions utils", () => {
  it("buildQuestionsFromTxt builds fill-in questions", () => {
    const txts = [{ txt: "1+1=_2_", MD5: false, image: "" }];
    const built = buildQuestionsFromTxt(txts, []);
    expect(built).toHaveLength(1);
    expect(built[0].answers[0]).toEqual(["2"]);
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
      answers: [["2"]],
      results: ["2"],
      MD5: false
    };
    expect(judgeAnswerTrue(question, 0)).toBe(true);
  });

  it("computes progress numbers", () => {
    const questions = [
      {
        answers: [["2"], ["4"]],
        results: ["2", "5"],
        MD5: false
      }
    ];
    expect(trueAnswerNumber(questions)).toBe(1);
    expect(allAnswerNumber(questions)).toBe(2);
    expect(numberToPercent(1, 2)).toBe(50);
  });
});
