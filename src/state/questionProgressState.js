import { reactive } from "vue";

export const questionProgressState = reactive({
  totalQuestions: 0,
  attemptedQuestions: 0,
  fullyCorrectQuestions: 0,
  totalSlots: 0,
  attemptedSlots: 0,
  correctSlots: 0,
  wrongSlots: 0,
  unansweredSlots: 0,
  unansweredQuestionIndexes: [],
  wrongQuestionCount: 0
});
