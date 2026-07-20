import type { ChatMessage } from "./prompts";

export interface TutorSession {
  open: boolean;
  messages: ChatMessage[];
}

const sessions = new Map<string, TutorSession>();

export function makeSessionKey(bankId: unknown, qindex: unknown): string {
  return `${String(bankId || "unknown")}:${qindex}`;
}

export function getSession(bankId: unknown, qindex: unknown): TutorSession {
  const key = makeSessionKey(bankId, qindex);
  if (!sessions.has(key)) {
    sessions.set(key, { open: false, messages: [] });
  }
  return sessions.get(key)!;
}

export function setSessionOpen(bankId: unknown, qindex: unknown, open: unknown): void {
  const session = getSession(bankId, qindex);
  session.open = Boolean(open);
}

export function setSessionMessages(
  bankId: unknown,
  qindex: unknown,
  messages: ChatMessage[] | unknown
): void {
  const session = getSession(bankId, qindex);
  session.messages = Array.isArray(messages) ? messages : [];
}

export function clearSession(bankId: unknown, qindex: unknown): void {
  sessions.delete(makeSessionKey(bankId, qindex));
}

export function clearSessionsForBank(bankId: unknown): void {
  const prefix = `${String(bankId || "unknown")}:`;
  for (const key of [...sessions.keys()]) {
    if (key.startsWith(prefix)) {
      sessions.delete(key);
    }
  }
}
