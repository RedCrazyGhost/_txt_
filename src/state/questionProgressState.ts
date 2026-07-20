import { reactive } from "vue";
import type { ProgressAggregates } from "../models/question/progress";

export interface QuestionProgressState extends ProgressAggregates {
  unansweredQuestionIndexes: number[];
  wrongQuestionCount: number;
  partialQuestionCount: number;
}

export const questionProgressState = reactive<QuestionProgressState>({
  totalQuestions: 0,
  attemptedQuestions: 0,
  fullyCorrectQuestions: 0,
  totalSlots: 0,
  attemptedSlots: 0,
  correctSlots: 0,
  partialSlots: 0,
  wrongSlots: 0,
  unansweredSlots: 0,
  unansweredQuestionIndexes: [],
  wrongQuestionCount: 0,
  partialQuestionCount: 0
});
