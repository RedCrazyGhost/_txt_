import type { ChoiceOption, FillBlankQuestion, SingleChoiceQuestion } from "./types";

const LETTER_ANSWER_RE = /^[a-dA-D]$/;
const OPTION_BLOCK_RE = /\n([A-D])\.\s*(.+?)(?=\n[A-D]\.|$)/gs;

function isLetterAnswerSlot(answers: string[][]): boolean {
  if (answers.length !== 1) return false;
  const slot = answers[0] || [];
  return slot.length > 0 && slot.every((value) => LETTER_ANSWER_RE.test(value));
}

function parseOptions(fullText: string): ChoiceOption[] {
  const options: ChoiceOption[] = [];
  OPTION_BLOCK_RE.lastIndex = 0;
  let match = OPTION_BLOCK_RE.exec(fullText);
  while (match) {
    options.push({ key: match[1], text: match[2].trim() });
    match = OPTION_BLOCK_RE.exec(fullText);
  }
  return options;
}

function stripOptionBlock(text: string): string {
  const index = text.search(/\n[A-D]\./);
  if (index === -1) return text;
  return text.slice(0, index).trimEnd();
}

function buildStem(question: FillBlankQuestion): string {
  const parts: string[] = [];
  const texts = question.texts || [];

  texts.forEach((segment, index) => {
    if (index % 2 === 0) {
      parts.push(stripOptionBlock(segment));
      return;
    }
    parts.push("（  ）");
  });

  return parts.join("").trim();
}

export function detectSingleChoiceFromFillBlank(
  question: FillBlankQuestion
): SingleChoiceQuestion | null {
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (!isLetterAnswerSlot(answers)) return null;

  const fullText = (question.texts || []).join("");
  const options = parseOptions(fullText);
  if (options.length < 2) return null;

  const stem = buildStem(question);
  if (!stem) return null;

  const slotCount = answers.length;
  const existingResults = Array.isArray(question.results) ? question.results : [];

  return {
    questionType: "singleChoice",
    stem,
    options,
    answers,
    results:
      existingResults.length === slotCount
        ? existingResults
        : new Array<string | undefined>(slotCount),
    MD5: Boolean(question.MD5),
    image: question.image || "",
    explanation: question.explanation
  };
}
