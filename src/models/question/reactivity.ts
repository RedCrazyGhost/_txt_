import { markRaw } from "vue";
import type { Question } from "./types";
import { isChoiceQuestion } from "./types";

export function finalizeQuestionReactivity(question: Question): Question {
  markRaw(question.answers);

  if (isChoiceQuestion(question)) {
    markRaw(question.options);
  } else {
    markRaw(question.texts);
    if (question.answerslength) {
      markRaw(question.answerslength);
    }
  }

  return question;
}
