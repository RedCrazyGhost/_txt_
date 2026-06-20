import { getQuestionJSON } from "./api.js";
import { loadBanks, persistBanks } from "./questionBank.js";
import { questionBankState } from "../state/questionBankState.js";

let loadPromise = null;

async function fetchRemoteQuestionBanks() {
  let typeDirectories = [];
  try {
    const loadedTypes = await getQuestionJSON("/QuestionJSON/List");
    typeDirectories = Array.isArray(loadedTypes) ? loadedTypes : [];
  } catch (_error) {
    typeDirectories = [];
  }

  const loadedByTypes = await Promise.all(
    typeDirectories.map(async (typeName) => {
      try {
        const list = await getQuestionJSON(`/QuestionJSON/${typeName}/List`);
        const fileNames = Array.isArray(list) ? list : [];
        const loadedBanks = await Promise.all(
          fileNames.map(async (fileName) => {
            const loaded = await getQuestionJSON(`/QuestionJSON/${typeName}/${fileName}`);
            return {
              id: `${typeName}-${fileName}`,
              source: "remote",
              directory: typeName,
              groupKey: typeName,
              groupLabel: typeName,
              title: loaded?.name || fileName.replace(/\.json$/i, ""),
              subject: loaded?.type || typeName,
              author: loaded?.author || "",
              updatedAt: loaded?.CreateTime || new Date().toISOString(),
              CreateTime: loaded?.CreateTime || "",
              version: loaded?.version || "0.0.2",
              questions: Array.isArray(loaded?.questions) ? loaded.questions : []
            };
          })
        );
        return loadedBanks;
      } catch (_error) {
        return [];
      }
    })
  );

  return loadedByTypes.flat().reverse();
}

export function reloadRemoteBanksFromCache() {
  questionBankState.remoteBanks = loadBanks("remote");
  return questionBankState.remoteBanks;
}

export async function loadRemoteQuestionBanks(options = {}) {
  const { force = false } = options;

  if (!force && questionBankState.remoteBanks.length > 0) {
    return questionBankState.remoteBanks;
  }

  if (!force) {
    const cached = loadBanks("remote");
    if (cached.length > 0) {
      questionBankState.remoteBanks = cached;
      return cached;
    }
  }

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const banks = await fetchRemoteQuestionBanks();
    questionBankState.remoteBanks = banks;
    if (banks.length > 0) {
      persistBanks("remote", banks);
    }
    return banks;
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}
