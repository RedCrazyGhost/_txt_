import type { Question } from "../models/question/types";
import { appState } from "../state/appState";
import { buildQuestionsFromTxt } from "../utils/questions";

export async function syncHomeSessionProgress(questions: Question[]): Promise<void> {
  const [{ resolveQuestionBankVersion }, { resetQuestionProgress }] = await Promise.all([
    import("../utils/questions"),
    import("../models/question/progress")
  ]);
  const {
    applyProgressToQuestions,
    buildSessionBankId,
    listIncompletePracticeNotebooks,
    notebookToProgressRecord
  } = await import("./practiceProgress");

  appState.questionsJSON.bankSource = "session";
  appState.questionsJSON.version = resolveQuestionBankVersion(questions);
  const nextBankId = buildSessionBankId(
    {
      name: appState.questionsJSON.name,
      type: appState.questionsJSON.type,
      author: appState.questionsJSON.author,
      version: appState.questionsJSON.version
    },
    questions
  );
  appState.questionsJSON.bankId = nextBankId;
  appState.questionsJSON.practiceMode = "resume";

  const incomplete = listIncompletePracticeNotebooks(nextBankId);
  const latest = incomplete[0];
  if (latest) {
    appState.questionsJSON.notebookId = latest.id;
    applyProgressToQuestions(questions, notebookToProgressRecord(latest));
  } else {
    appState.questionsJSON.notebookId = "";
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
