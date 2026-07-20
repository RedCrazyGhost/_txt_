import md5 from "js-md5";
import type { Question, QuestionType } from "../models/question/types";
import { isMultipleChoiceQuestion } from "../models/question/types";

export type { Question, QuestionType, FillBlankQuestion, SingleChoiceQuestion } from "../models/question/types";
export {
  normalizeQuestion,
  normalizeQuestionWithDetection,
  usesExtendedQuestionSchema,
  resolveQuestionBankVersion
} from "../models/question/normalize";
export { getQuestionTypeLabel, getQuestionTypeBadgeClass } from "../models/question/labels";

export interface TxtObject {
  txt: string;
  MD5: boolean;
  image: string;
  /** 为 true 时不允许删除本题（Step 1） */
  noDelete?: boolean;
  /** 题目解析（可选，AI 生成或手动维护） */
  explanation?: string;
}

export function getQuestionType(question: Question): QuestionType {
  return question.questionType ?? "fillBlank";
}

export function getAnswerSlotCount(question: Question): number {
  return question.answers.length;
}

export type SlotOutcome = "correct" | "partial" | "wrong";

export function normalizeSelectedKeys(value: unknown): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .sort();
}

function judgeMultipleChoiceOutcome(correctAnswers: string[], userValue: unknown): SlotOutcome {
  const correctKeys = new Set(correctAnswers.map((item) => item.toUpperCase()));
  if (!correctKeys.size) return "wrong";

  const userKeys = normalizeSelectedKeys(userValue);
  if (!userKeys.length) return "wrong";

  const hasWrongSelection = userKeys.some((key) => !correctKeys.has(key));
  if (hasWrongSelection) return "wrong";

  if (userKeys.length === correctKeys.size) return "correct";
  return "partial";
}

function judgeMultipleChoiceSlot(correctAnswers: string[], userValue: unknown): boolean {
  return judgeMultipleChoiceOutcome(correctAnswers, userValue) === "correct";
}

export function judgeSlotOutcome(question: Question, index: number): SlotOutcome {
  const value = question.results?.[index];
  const attempted =
    value !== undefined && value !== null && String(value).trim() !== "";
  if (!attempted) return "wrong";

  const slot = question.answers[index] || [];
  if (!slot.length) return "wrong";

  if (isMultipleChoiceQuestion(question)) {
    return judgeMultipleChoiceOutcome(slot, value);
  }

  return judgeAnswerTrue(question, index) ? "correct" : "wrong";
}

export function judgeAnswerTrue(question: Question, index: number): boolean {
  const slot = question.answers[index] || [];
  if (!slot.length) return false;

  if (isMultipleChoiceQuestion(question)) {
    return judgeMultipleChoiceSlot(slot, question.results?.[index]);
  }

  let isTrue = false;
  slot.forEach((answer) => {
    if (question.MD5) {
      if (md5(question.results?.[index] || "") === answer) isTrue = true;
    } else if (question.results?.[index] === answer) {
      isTrue = true;
    }
  });
  return isTrue;
}

export function trueAnswerNumber(questions: Question[]): number {
  let count = 0;
  questions.forEach((question) => {
    const slotCount = getAnswerSlotCount(question);
    for (let index = 0; index < slotCount; index += 1) {
      if (judgeAnswerTrue(question, index)) count += 1;
    }
  });
  return count;
}

export function allAnswerNumber(questions: Question[]): number {
  return questions.reduce((total, question) => total + getAnswerSlotCount(question), 0);
}

export function numberToPercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

export function answerLength(text: string): number {
  let length = 0;
  text.split("").forEach((i) => {
    if (new RegExp("[\u4E00-\u9FA5]").test(i)) length += 17;
    if (new RegExp("[a-z]").test(i)) length += 11;
    if (new RegExp("[A-Z]").test(i)) length += 12;
    if (new RegExp("[0-9]").test(i)) length += 11;
    if (
      new RegExp(
        "[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]"
      ).test(i)
    ) {
      length += 13;
    }
    if (new RegExp("[\u0021-\u002f|\u003a-\u0040|\u005b-\u0060|\u007b-\u007e]").test(i)) {
      length += 7;
    }
  });
  return length + 4;
}

export function txtCharNumber(txt: string, char?: string): number {
  let number = 0;
  if (!char) {
    number = 1;
    Array.from(txt).forEach((tchar) => {
      if (tchar === "\n") number += 1;
    });
    return number;
  }
  Array.from(txt).forEach((tchar) => {
    if (tchar === char) number += 1;
  });
  return number;
}

export function buildQuestionsFromTxt(
  txts: TxtObject[],
  currentQuestions: Question[]
): Question[] {
  const re = /\_.*?\_/g;
  const next = [...currentQuestions];
  txts.forEach((txtObject) => {
    const valid =
      txtObject.txt.length !== 0 &&
      txtCharNumber(txtObject.txt, "_") % 2 === 0 &&
      txtObject.txt.match(re) !== null;
    if (!valid) return;

    let middleArray: string[][] = [];
    txtObject.txt.split("_").forEach((i, index) => {
      if (index % 2 === 1) middleArray.push(i.split(","));
    });

    const middleTexts = txtObject.txt.split("_");
    const answerLengths: number[] = [];
    const md5Answer: string[][] = [];

    middleTexts.forEach((text, index) => {
      if (index % 2 === 1) answerLengths.push(answerLength(text));
    });

    if (txtObject.MD5) {
      middleArray.forEach((arr) => {
        const middleMD5Answer: string[] = [];
        for (let index = 0; index < arr.length; index += 1) {
          middleMD5Answer.push(md5(arr[index]));
        }
        md5Answer.push(middleMD5Answer);
      });
      for (let index = 0; index < middleTexts.length; index += 1) {
        if (index % 2 === 1) middleTexts[index] = md5Answer[(index - 1) / 2].toString();
      }
      middleArray = md5Answer;
    }

    const explanation = txtObject.explanation?.trim();
    next.push({
      texts: middleTexts,
      answers: middleArray,
      answerslength: answerLengths,
      results: new Array(middleArray.length),
      MD5: txtObject.MD5,
      image: txtObject.image,
      ...(explanation ? { explanation } : {})
    });
  });
  return next;
}
