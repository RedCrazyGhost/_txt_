import type { Question } from "../models/question/types";
import { appState } from "../state/appState";
import { buildQuestionsFromTxt } from "../utils/questions";

export async function syncHomeSessionProgress(questions: Question[]): Promise<void> {
  const [{ resolveQuestionBankVersion }, { resetQuestionProgress }] = await Promise.all([
    import("../utils/questions"),
    import("../models/question/progress")
  ]);
  const { buildSessionBankId, getProgressRecord, applyProgressToQuestions } = await import(
    "./practiceProgress"
  );

  appState.questionsJSON.bankSource = "session";
  appState.questionsJSON.version = resolveQuestionBankVersion(questions);
  appState.questionsJSON.bankId = buildSessionBankId(
    {
      name: appState.questionsJSON.name,
      type: appState.questionsJSON.type,
      author: appState.questionsJSON.author,
      version: appState.questionsJSON.version
    },
    questions
  );

  const saved = getProgressRecord(appState.questionsJSON.bankId);
  if (saved) {
    applyProgressToQuestions(questions, saved);
  }
  resetQuestionProgress(questions);
}

export async function generateQuestionsJsonFromTxts(): Promise<void> {
  const { normalizeQuestionWithDetection } = await import("../utils/questions");
  appState.questionsJSON.questions = buildQuestionsFromTxt(appState.txts, []).map((question) =>
    normalizeQuestionWithDetection(question)
  );
  await syncHomeSessionProgress(appState.questionsJSON.questions);
}
