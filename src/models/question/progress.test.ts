import { describe, expect, it } from "vitest";
import type { Question } from "./types";
import {
  createProgressSnapshot,
  notifySlotChanged,
  resetQuestionProgress,
  syncQuestionProgress
} from "./progress";
import { questionProgressState } from "../../state/questionProgressState";
import { allAnswerNumber, trueAnswerNumber } from "../../utils/questions";

describe("question progress", () => {
  it("creates empty snapshot for empty question set", () => {
    const snapshot = createProgressSnapshot([]);
    expect(snapshot.totalSlots).toBe(0);
    expect(snapshot.correctSlots).toBe(0);
  });

  it("tracks practice summary aggregates on reset", () => {
    const questions = [
      {
        questionType: "fillBlank",
        texts: ["a", "2", " b ", "4", ""],
        answers: [["2"], ["4"]],
        results: ["2", "5"],
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
        answers: [["B", "b"]],
        results: ["B"],
        MD5: false,
        image: ""
      }
    ] as Question[];

    resetQuestionProgress(questions);
    expect(questionProgressState.totalQuestions).toBe(2);
    expect(questionProgressState.totalSlots).toBe(allAnswerNumber(questions));
    expect(questionProgressState.attemptedSlots).toBe(3);
    expect(questionProgressState.correctSlots).toBe(trueAnswerNumber(questions));
    expect(questionProgressState.wrongSlots).toBe(1);
    expect(questionProgressState.unansweredSlots).toBe(0);
    expect(questionProgressState.attemptedQuestions).toBe(2);
    expect(questionProgressState.fullyCorrectQuestions).toBe(1);
  });

  it("updates correctSlots incrementally when a slot changes", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["a", "2", ""],
      answers: [["2"]],
      results: [undefined],
      MD5: false,
      image: ""
    } as Question;

    resetQuestionProgress([question]);
    expect(questionProgressState.correctSlots).toBe(0);

    question.results![0] = "2";
    notifySlotChanged(0, question, 0);
    expect(questionProgressState.correctSlots).toBe(1);

    question.results![0] = "3";
    notifySlotChanged(0, question, 0);
    expect(questionProgressState.correctSlots).toBe(0);

    question.results![0] = "";
    notifySlotChanged(0, question, 0);
    expect(questionProgressState.correctSlots).toBe(0);
  });

  it("only adjusts aggregates for the changed question among many", () => {
    const questions = [
      {
        questionType: "fillBlank",
        texts: ["a", "2", ""],
        answers: [["2"]],
        results: [undefined],
        MD5: false,
        image: ""
      },
      {
        questionType: "fillBlank",
        texts: ["b", "4", ""],
        answers: [["4"]],
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
    ] as Question[];

    resetQuestionProgress(questions);
    expect(questionProgressState.attemptedSlots).toBe(1);
    expect(questionProgressState.correctSlots).toBe(1);
    expect(questionProgressState.attemptedQuestions).toBe(1);
    expect(questionProgressState.fullyCorrectQuestions).toBe(1);

    questions[0]!.results![0] = "2";
    notifySlotChanged(0, questions[0]!, 0);

    expect(questionProgressState.attemptedSlots).toBe(2);
    expect(questionProgressState.correctSlots).toBe(2);
    expect(questionProgressState.wrongSlots).toBe(0);
    expect(questionProgressState.attemptedQuestions).toBe(2);
    expect(questionProgressState.fullyCorrectQuestions).toBe(2);
    expect(questionProgressState.unansweredQuestionIndexes).toEqual([2]);
    expect(questionProgressState.wrongQuestionCount).toBe(0);
  });

  it("tracks unanswered and wrong question counts incrementally", () => {
    const questions = [
      {
        questionType: "fillBlank",
        texts: ["a", "2", ""],
        answers: [["2"]],
        results: [undefined],
        MD5: false,
        image: ""
      },
      {
        questionType: "fillBlank",
        texts: ["b", "3", ""],
        answers: [["4"]],
        results: ["3"],
        MD5: false,
        image: ""
      }
    ] as Question[];

    resetQuestionProgress(questions);
    expect(questionProgressState.unansweredQuestionIndexes).toEqual([0]);
    expect(questionProgressState.wrongQuestionCount).toBe(1);

    questions[0]!.results![0] = "2";
    notifySlotChanged(0, questions[0]!, 0);
    expect(questionProgressState.unansweredQuestionIndexes).toEqual([]);
    expect(questionProgressState.wrongQuestionCount).toBe(1);

    questions[1]!.results![0] = "4";
    notifySlotChanged(1, questions[1]!, 0);
    expect(questionProgressState.wrongQuestionCount).toBe(0);
  });

  it("syncQuestionProgress restores counts after peek-like replacement", () => {
    const question = {
      questionType: "fillBlank",
      texts: ["a", "2", ""],
      answers: [["2"]],
      results: ["3"],
      MD5: false,
      image: ""
    } as Question;

    resetQuestionProgress([question]);
    expect(questionProgressState.correctSlots).toBe(0);

    const oldValue = [...(question.results ?? [])];
    question.results = ["2"];
    syncQuestionProgress(0, question);
    expect(questionProgressState.correctSlots).toBe(1);

    question.results = oldValue;
    syncQuestionProgress(0, question);
    expect(questionProgressState.correctSlots).toBe(0);
  });

  it("tracks partial slots for multipleChoice without counting as wrong", () => {
    const question = {
      questionType: "multipleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" },
        { key: "C", text: "选项C" }
      ],
      answers: [["A", "C"]],
      results: [undefined],
      MD5: false,
      image: ""
    } as Question;

    resetQuestionProgress([question]);
    question.results![0] = "A";
    notifySlotChanged(0, question, 0);

    expect(questionProgressState.partialSlots).toBe(1);
    expect(questionProgressState.wrongSlots).toBe(0);
    expect(questionProgressState.wrongQuestionCount).toBe(0);
    expect(questionProgressState.partialQuestionCount).toBe(1);

    question.results![0] = "A,B";
    notifySlotChanged(0, question, 0);

    expect(questionProgressState.partialSlots).toBe(0);
    expect(questionProgressState.wrongSlots).toBe(1);
    expect(questionProgressState.wrongQuestionCount).toBe(1);
    expect(questionProgressState.partialQuestionCount).toBe(0);
  });
});
