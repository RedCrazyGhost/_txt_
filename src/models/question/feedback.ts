import type { Question } from "./types";
import { getAnswerSlotCount, judgeAnswerTrue } from "../../utils/questions";

function isAttempted(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isAnswerAttempted(value: unknown): boolean {
  return isAttempted(value);
}

export function isSlotAttempted(question: Question, index: number): boolean {
  return isAttempted(question.results?.[index]);
}

export function getAttemptedSlotIndexes(question: Question): number[] {
  const slotCount = getAnswerSlotCount(question);
  return Array.from({ length: slotCount }, (_, index) => index).filter((index) =>
    isSlotAttempted(question, index)
  );
}

export function hasAnyAttempt(question: Question): boolean {
  const results = question.results || [];
  return results.some((value) => isAttempted(value));
}

export function hasUnansweredSlot(question: Question): boolean {
  const slotCount = getAnswerSlotCount(question);
  for (let index = 0; index < slotCount; index += 1) {
    if (!isSlotAttempted(question, index)) return true;
  }
  return false;
}

export function getUnansweredQuestionIndexes(questions: Question[]): number[] {
  return questions
    .map((question, index) => (hasUnansweredSlot(question) ? index : -1))
    .filter((index) => index >= 0);
}

export function hasAnyWrongAttempt(question: Question): boolean {
  const slotCount = getAnswerSlotCount(question);
  for (let index = 0; index < slotCount; index += 1) {
    if (isAttempted(question.results?.[index]) && !judgeAnswerTrue(question, index)) {
      return true;
    }
  }
  return false;
}

export function shouldShowExplanation(question: Question): boolean {
  if (!hasAnyWrongAttempt(question)) return false;
  if (question.explanation?.trim()) return true;
  if (question.MD5) return false;
  return getAnswerSlotCount(question) > 0;
}

export function shouldShowExplanationPanel(question: Question, peeking = false): boolean {
  if (peeking) {
    if (question.explanation?.trim()) return true;
    if (question.MD5) return false;
    return getAnswerSlotCount(question) > 0;
  }
  return shouldShowExplanation(question);
}

export function formatCorrectAnswers(question: Question, index?: number): string {
  if (question.MD5) return "";

  if (index !== undefined) {
    const slot = question.answers[index] || [];
    return slot.join(" / ");
  }

  const slotCount = getAnswerSlotCount(question);
  const parts: string[] = [];
  for (let i = 0; i < slotCount; i += 1) {
    const slot = question.answers[i] || [];
    if (!slot.length) continue;
    const label = slotCount > 1 ? `第${i + 1}空：` : "";
    parts.push(`${label}${slot.join(" / ")}`);
  }
  return parts.join("；");
}

export function getWrongSlotIndexes(question: Question): number[] {
  const slotCount = getAnswerSlotCount(question);
  const indexes: number[] = [];
  for (let index = 0; index < slotCount; index += 1) {
    if (isAttempted(question.results?.[index]) && !judgeAnswerTrue(question, index)) {
      indexes.push(index);
    }
  }
  return indexes;
}
