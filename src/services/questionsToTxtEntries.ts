import type { Question, FillBlankQuestion } from "../models/question/types";
import { isChoiceQuestion } from "../models/question/types";
import type { TxtEntry } from "../state/appState";

/** Convert stored questions into manual-panel txt entries (best-effort for choice types). */
export function questionsToTxtEntries(questions: Question[]): TxtEntry[] {
  if (!questions.length) {
    return [{ txt: "", MD5: false, image: "", noDelete: false, explanation: "" }];
  }

  return questions.map((question) => {
    if (isChoiceQuestion(question)) {
      const lines = [
        question.stem,
        ...question.options.map((option) => `${option.key}. ${option.text}`)
      ];
      const answer = (question.answers[0] || []).join(",");
      return {
        txt: `${lines.join("\n")}\n_${answer}_`,
        MD5: Boolean(question.MD5),
        image: question.image || "",
        noDelete: false,
        explanation: question.explanation || ""
      };
    }

    const fillBlank = question as FillBlankQuestion;
    const texts = Array.isArray(fillBlank.texts) ? fillBlank.texts : [""];
    const answers = Array.isArray(fillBlank.answers) ? fillBlank.answers : [];
    let txt = "";
    for (let index = 0; index < texts.length; index += 1) {
      txt += texts[index] ?? "";
      if (index < answers.length) {
        txt += `_${(answers[index] || []).join(",")}_`;
      }
    }
    return {
      txt,
      MD5: Boolean(fillBlank.MD5),
      image: fillBlank.image || "",
      noDelete: false,
      explanation: fillBlank.explanation || ""
    };
  });
}
