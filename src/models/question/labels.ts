import type { QuestionType } from "./types";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  fillBlank: "填空题",
  singleChoice: "单选题",
  multipleChoice: "多选题",
  judgment: "判断题",
  subjective: "主观题"
};

export const QUESTION_TYPE_BADGE_CLASS: Record<QuestionType, string> = {
  fillBlank: "text-bg-secondary",
  singleChoice: "text-bg-primary",
  multipleChoice: "text-bg-info",
  judgment: "text-bg-success",
  subjective: "text-bg-warning"
};

export function getQuestionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type] ?? QUESTION_TYPE_LABELS.fillBlank;
}

export function getQuestionTypeBadgeClass(type: QuestionType): string {
  return QUESTION_TYPE_BADGE_CLASS[type] ?? QUESTION_TYPE_BADGE_CLASS.fillBlank;
}
