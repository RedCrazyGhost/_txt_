const sessions = new Map();

export function makeSessionKey(bankId, qindex) {
  return `${String(bankId || "unknown")}:${qindex}`;
}

export function getSession(bankId, qindex) {
  const key = makeSessionKey(bankId, qindex);
  if (!sessions.has(key)) {
    sessions.set(key, { open: false, messages: [] });
  }
  return sessions.get(key);
}

export function setSessionOpen(bankId, qindex, open) {
  const session = getSession(bankId, qindex);
  session.open = Boolean(open);
}

export function setSessionMessages(bankId, qindex, messages) {
  const session = getSession(bankId, qindex);
  session.messages = Array.isArray(messages) ? messages : [];
}

export function clearSession(bankId, qindex) {
  sessions.delete(makeSessionKey(bankId, qindex));
}

export function clearSessionsForBank(bankId) {
  const prefix = `${String(bankId || "unknown")}:`;
  for (const key of [...sessions.keys()]) {
    if (key.startsWith(prefix)) {
      sessions.delete(key);
    }
  }
}
