import type { Question } from "../models/question/types";
import { getQuestionJSON } from "./api";
import { loadBanks, persistBanks, type Bank } from "./questionBank";
import { questionBankState } from "../state/questionBankState";

export interface RemoteBank extends Bank {
  source: "remote";
  directory: string;
  groupKey: string;
  groupLabel: string;
  CreateTime: string;
  version: string;
}

export interface LoadRemoteQuestionBanksOptions {
  force?: boolean;
}

interface RemoteQuestionJsonPayload {
  name?: string;
  type?: string;
  author?: string;
  CreateTime?: string;
  version?: string;
  questions?: Question[];
}

function asRemoteQuestionJsonPayload(value: unknown): RemoteQuestionJsonPayload {
  if (!value || typeof value !== "object") return {};
  return value as RemoteQuestionJsonPayload;
}

let loadPromise: Promise<RemoteBank[]> | null = null;

async function fetchRemoteQuestionBanks(): Promise<RemoteBank[]> {
  let typeDirectories: string[] = [];
  try {
    const loadedTypes = await getQuestionJSON("/QuestionJSON/List");
    typeDirectories = Array.isArray(loadedTypes) ? (loadedTypes as string[]) : [];
  } catch (_error) {
    typeDirectories = [];
  }

  const loadedByTypes = await Promise.all(
    typeDirectories.map(async (typeName) => {
      try {
        const list = await getQuestionJSON(`/QuestionJSON/${typeName}/List`);
        const fileNames = Array.isArray(list) ? (list as string[]) : [];
        const loadedBanks = await Promise.all(
          fileNames.map(async (fileName) => {
            const loaded = asRemoteQuestionJsonPayload(
              await getQuestionJSON(`/QuestionJSON/${typeName}/${fileName}`)
            );
            return {
              id: `${typeName}-${fileName}`,
              source: "remote" as const,
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

export function reloadRemoteBanksFromCache(): RemoteBank[] {
  questionBankState.remoteBanks = loadBanks("remote") as RemoteBank[];
  return questionBankState.remoteBanks as RemoteBank[];
}

export async function loadRemoteQuestionBanks(
  options: LoadRemoteQuestionBanksOptions = {}
): Promise<RemoteBank[]> {
  const { force = false } = options;

  if (!force && questionBankState.remoteBanks.length > 0) {
    return questionBankState.remoteBanks as RemoteBank[];
  }

  if (!force) {
    const cached = loadBanks("remote") as RemoteBank[];
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
