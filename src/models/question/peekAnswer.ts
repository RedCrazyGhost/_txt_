import type { Question } from "./types";
import { isMultipleChoiceQuestion, isSingleChoiceLikeQuestion } from "./types";

/** 偷看/回填时，选择题需与 options.key 一致才能选中 */
export function resolvePeekAnswer(question: Question, slotIndex = 0): string | undefined {
  const slot = question.answers[slotIndex] || [];
  if (!slot.length) return undefined;

  if (isMultipleChoiceQuestion(question)) {
    return slot
      .map((answer) => answer.toUpperCase())
      .sort()
      .join(",");
  }

  if (isSingleChoiceLikeQuestion(question) && question.options?.length) {
    const optionKeys = question.options.map((option) => option.key);
    const matched = slot.find((answer) => optionKeys.includes(answer));
    if (matched) return matched;

    const upperKeys = new Map(optionKeys.map((key) => [key.toUpperCase(), key]));
    const caseMatched = slot.find((answer) => upperKeys.has(answer.toUpperCase()));
    if (caseMatched) return upperKeys.get(caseMatched.toUpperCase());

    return optionKeys[0];
  }

  return slot[0];
}

export function buildPeekResults(question: Question): Array<string | undefined> {
  const slotCount = question.answers.length;
  return Array.from({ length: slotCount }, (_, index) => resolvePeekAnswer(question, index));
}
