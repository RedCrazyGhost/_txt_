export type QuestionType =
  | "fillBlank"
  | "singleChoice"
  | "multipleChoice"
  | "judgment"
  | "subjective";

export interface QuestionBase {
  questionType?: QuestionType;
  image?: string;
  MD5?: boolean;
  explanation?: string;
  results?: Array<string | undefined>;
}

export interface ChoiceOption {
  key: string;
  text: string;
}

export interface FillBlankQuestion extends QuestionBase {
  questionType?: "fillBlank";
  texts: string[];
  answers: string[][];
  answerslength?: number[];
}

export interface ChoiceQuestion extends QuestionBase {
  stem: string;
  options: ChoiceOption[];
  answers: string[][];
}

export interface SingleChoiceQuestion extends ChoiceQuestion {
  questionType: "singleChoice";
}

export interface MultipleChoiceQuestion extends ChoiceQuestion {
  questionType: "multipleChoice";
}

export interface JudgmentQuestion extends ChoiceQuestion {
  questionType: "judgment";
}

export type Question =
  | FillBlankQuestion
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | JudgmentQuestion;

export function isChoiceQuestion(
  question: Question
): question is SingleChoiceQuestion | MultipleChoiceQuestion | JudgmentQuestion {
  return (
    question.questionType === "singleChoice" ||
    question.questionType === "multipleChoice" ||
    question.questionType === "judgment"
  );
}

export function isSingleChoiceQuestion(question: Question): question is SingleChoiceQuestion {
  return question.questionType === "singleChoice";
}

export function isMultipleChoiceQuestion(
  question: Question
): question is MultipleChoiceQuestion {
  return question.questionType === "multipleChoice";
}

export function isJudgmentQuestion(question: Question): question is JudgmentQuestion {
  return question.questionType === "judgment";
}

export function isSingleChoiceLikeQuestion(
  question: Question
): question is SingleChoiceQuestion | JudgmentQuestion {
  return question.questionType === "singleChoice" || question.questionType === "judgment";
}

export function isFillBlankQuestion(question: Question): question is FillBlankQuestion {
  return !isChoiceQuestion(question);
}
