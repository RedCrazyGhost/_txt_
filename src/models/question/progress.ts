import type { Question } from "./types";
import { isSlotAttempted } from "./feedback";
import { getAnswerSlotCount, judgeAnswerTrue } from "../../utils/questions";
import { questionProgressState } from "../../state/questionProgressState";

export interface SlotState {
  attempted: boolean;
  correct: boolean;
}

export interface ProgressAggregates {
  totalQuestions: number;
  attemptedQuestions: number;
  fullyCorrectQuestions: number;
  totalSlots: number;
  attemptedSlots: number;
  correctSlots: number;
  wrongSlots: number;
  unansweredSlots: number;
}

export interface ProgressSnapshot extends ProgressAggregates {
  slotStates: SlotState[][];
}

let slotStates: SlotState[][] = [];
let currentQuestions: Question[] = [];
let unansweredIndexSet = new Set<number>();

const EMPTY_SLOT_STATE: SlotState = { attempted: false, correct: false };

interface QuestionFlags {
  hasUnanswered: boolean;
  hasWrongAttempt: boolean;
}

function getQuestionFlags(states: SlotState[]): QuestionFlags {
  let hasUnanswered = false;
  let hasWrongAttempt = false;

  states.forEach((state) => {
    if (!state.attempted) {
      hasUnanswered = true;
      return;
    }
    if (!state.correct) hasWrongAttempt = true;
  });

  return { hasUnanswered, hasWrongAttempt };
}

function setUnansweredQuestionIndexes(indexes: number[]): void {
  unansweredIndexSet = new Set(indexes);
  questionProgressState.unansweredQuestionIndexes = indexes;
}

function addUnansweredQuestionIndex(questionIndex: number): void {
  if (unansweredIndexSet.has(questionIndex)) return;
  unansweredIndexSet.add(questionIndex);
  questionProgressState.unansweredQuestionIndexes = [
    ...questionProgressState.unansweredQuestionIndexes,
    questionIndex
  ].sort((a, b) => a - b);
}

function removeUnansweredQuestionIndex(questionIndex: number): void {
  if (!unansweredIndexSet.has(questionIndex)) return;
  unansweredIndexSet.delete(questionIndex);
  questionProgressState.unansweredQuestionIndexes =
    questionProgressState.unansweredQuestionIndexes.filter((index) => index !== questionIndex);
}

function syncQuestionTracking(
  questionIndex: number,
  oldStates: SlotState[],
  newStates: SlotState[]
): void {
  const oldFlags = getQuestionFlags(oldStates);
  const newFlags = getQuestionFlags(newStates);

  if (oldFlags.hasUnanswered !== newFlags.hasUnanswered) {
    if (newFlags.hasUnanswered) {
      addUnansweredQuestionIndex(questionIndex);
    } else {
      removeUnansweredQuestionIndex(questionIndex);
    }
  }

  if (oldFlags.hasWrongAttempt !== newFlags.hasWrongAttempt) {
    questionProgressState.wrongQuestionCount += newFlags.hasWrongAttempt ? 1 : -1;
  }
}

function rebuildQuestionTracking(questions: Question[], states: SlotState[][]): void {
  const unanswered: number[] = [];
  let wrongQuestionCount = 0;

  questions.forEach((_, questionIndex) => {
    const flags = getQuestionFlags(states[questionIndex] ?? []);
    if (flags.hasUnanswered) unanswered.push(questionIndex);
    if (flags.hasWrongAttempt) wrongQuestionCount += 1;
  });

  setUnansweredQuestionIndexes(unanswered);
  questionProgressState.wrongQuestionCount = wrongQuestionCount;
}

export function isTrackedQuestionUnanswered(questionIndex: number): boolean {
  return unansweredIndexSet.has(questionIndex);
}

function computeSlotState(question: Question, slotIndex: number): SlotState {
  const attempted = isSlotAttempted(question, slotIndex);
  return {
    attempted,
    correct: attempted && judgeAnswerTrue(question, slotIndex)
  };
}

function buildSlotStatesForQuestion(question: Question): SlotState[] {
  const slotCount = getAnswerSlotCount(question);
  return Array.from({ length: slotCount }, (_, index) => computeSlotState(question, index));
}

function computeAggregates(questions: Question[], states: SlotState[][]): ProgressAggregates {
  let totalSlots = 0;
  let attemptedSlots = 0;
  let correctSlots = 0;
  let wrongSlots = 0;
  let attemptedQuestions = 0;
  let fullyCorrectQuestions = 0;

  questions.forEach((question, questionIndex) => {
    const questionStates = states[questionIndex] ?? buildSlotStatesForQuestion(question);
    let questionAttempted = 0;
    let questionCorrect = 0;

    questionStates.forEach((state) => {
      totalSlots += 1;
      if (!state.attempted) return;
      attemptedSlots += 1;
      questionAttempted += 1;
      if (state.correct) {
        correctSlots += 1;
        questionCorrect += 1;
      } else {
        wrongSlots += 1;
      }
    });

    if (questionAttempted > 0) attemptedQuestions += 1;
    if (
      questionStates.length > 0 &&
      questionAttempted === questionStates.length &&
      questionCorrect === questionStates.length
    ) {
      fullyCorrectQuestions += 1;
    }
  });

  return {
    totalQuestions: questions.length,
    attemptedQuestions,
    fullyCorrectQuestions,
    totalSlots,
    attemptedSlots,
    correctSlots,
    wrongSlots,
    unansweredSlots: totalSlots - attemptedSlots
  };
}

function applyAggregates(aggregates: ProgressAggregates): void {
  questionProgressState.totalQuestions = aggregates.totalQuestions;
  questionProgressState.attemptedQuestions = aggregates.attemptedQuestions;
  questionProgressState.fullyCorrectQuestions = aggregates.fullyCorrectQuestions;
  questionProgressState.totalSlots = aggregates.totalSlots;
  questionProgressState.attemptedSlots = aggregates.attemptedSlots;
  questionProgressState.correctSlots = aggregates.correctSlots;
  questionProgressState.wrongSlots = aggregates.wrongSlots;
  questionProgressState.unansweredSlots = aggregates.unansweredSlots;
}

interface QuestionSummary {
  hasAttempt: boolean;
  fullyCorrect: boolean;
}

function getQuestionSummary(states: SlotState[]): QuestionSummary {
  let attempted = 0;
  let correct = 0;

  states.forEach((state) => {
    if (!state.attempted) return;
    attempted += 1;
    if (state.correct) correct += 1;
  });

  return {
    hasAttempt: attempted > 0,
    fullyCorrect:
      states.length > 0 && attempted === states.length && correct === states.length
  };
}

function applySlotDelta(oldState: SlotState, newState: SlotState): void {
  if (oldState.attempted === newState.attempted && oldState.correct === newState.correct) {
    return;
  }

  if (oldState.attempted) {
    questionProgressState.attemptedSlots -= 1;
    if (oldState.correct) {
      questionProgressState.correctSlots -= 1;
    } else {
      questionProgressState.wrongSlots -= 1;
    }
  }

  if (newState.attempted) {
    questionProgressState.attemptedSlots += 1;
    if (newState.correct) {
      questionProgressState.correctSlots += 1;
    } else {
      questionProgressState.wrongSlots += 1;
    }
  }

  questionProgressState.unansweredSlots =
    questionProgressState.totalSlots - questionProgressState.attemptedSlots;
}

function applyQuestionSummaryDelta(oldSummary: QuestionSummary, newSummary: QuestionSummary): void {
  if (oldSummary.hasAttempt !== newSummary.hasAttempt) {
    questionProgressState.attemptedQuestions += newSummary.hasAttempt ? 1 : -1;
  }

  if (oldSummary.fullyCorrect !== newSummary.fullyCorrect) {
    questionProgressState.fullyCorrectQuestions += newSummary.fullyCorrect ? 1 : -1;
  }
}

function ensureQuestionSlotStates(questionIndex: number, question: Question): SlotState[] {
  const existing = slotStates[questionIndex];
  if (existing) return existing;

  const slotCount = getAnswerSlotCount(question);
  const nextStates = Array.from({ length: slotCount }, () => ({ ...EMPTY_SLOT_STATE }));
  slotStates[questionIndex] = nextStates;
  return nextStates;
}

function applySnapshot(snapshot: ProgressSnapshot, questions: Question[]): void {
  slotStates = snapshot.slotStates;
  applyAggregates(snapshot);
  rebuildQuestionTracking(questions, slotStates);
}

export function createProgressSnapshot(questions: Question[]): ProgressSnapshot {
  const slotStatesSnapshot = questions.map((question) => buildSlotStatesForQuestion(question));
  const aggregates = computeAggregates(questions, slotStatesSnapshot);
  return { ...aggregates, slotStates: slotStatesSnapshot };
}

export function resetQuestionProgress(questions: Question[]): void {
  currentQuestions = questions;
  applySnapshot(createProgressSnapshot(questions), questions);
}

export function notifySlotChanged(
  questionIndex: number,
  question: Question,
  slotIndex: number
): void {
  const questionStates = ensureQuestionSlotStates(questionIndex, question);
  const oldSlotState = questionStates[slotIndex] ?? EMPTY_SLOT_STATE;
  const oldSummary = getQuestionSummary(questionStates);

  const newSlotState = computeSlotState(question, slotIndex);
  questionStates[slotIndex] = newSlotState;

  applySlotDelta(oldSlotState, newSlotState);
  applyQuestionSummaryDelta(oldSummary, getQuestionSummary(questionStates));
  syncQuestionTracking(questionIndex, questionStates.map((state, index) =>
    index === slotIndex ? oldSlotState : state
  ), questionStates);
}

export function syncQuestionProgress(questionIndex: number, question: Question): void {
  const oldStates = slotStates[questionIndex] ?? [];
  const oldSummary = getQuestionSummary(oldStates);
  const nextStates = buildSlotStatesForQuestion(question);
  slotStates[questionIndex] = nextStates;

  const slotCount = Math.max(oldStates.length, nextStates.length);
  for (let index = 0; index < slotCount; index += 1) {
    applySlotDelta(oldStates[index] ?? EMPTY_SLOT_STATE, nextStates[index] ?? EMPTY_SLOT_STATE);
  }

  applyQuestionSummaryDelta(oldSummary, getQuestionSummary(nextStates));
  syncQuestionTracking(questionIndex, oldStates, nextStates);
}
