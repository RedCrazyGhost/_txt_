import { reactive } from "vue";
import {
  deleteBankById,
  loadBanks,
  type BankStatus
} from "../services/questionBank";
import type { TxtEntry } from "./appState";

export type BankSource = "local" | "remote";

export interface QuestionBankRecord {
  id: string;
  source: BankSource | string;
  title: string;
  subject: string;
  author: string;
  updatedAt: string;
  questions: unknown[];
  status?: BankStatus;
  editorTxts?: TxtEntry[];
  /** 兼容旧字段 / 导入元数据 */
  name?: string;
  type?: string;
  groupKey?: string;
  groupLabel?: string;
  CreateTime?: string;
}

export interface BankAdvancedFilters {
  name: string;
  type: string;
  author: string;
}

export interface BankSearchState {
  quickKeyword: string;
  searchField: string;
  advancedOpen: boolean;
  advancedFilters: BankAdvancedFilters;
}

export interface QuestionBankState {
  localBanks: QuestionBankRecord[];
  remoteBanks: QuestionBankRecord[];
  localSearch: BankSearchState;
  remoteSearch: BankSearchState;
  statusMessage: string;
}

export const questionBankState = reactive<QuestionBankState>({
  localBanks: [],
  remoteBanks: [],
  localSearch: {
    quickKeyword: "",
    searchField: "name",
    advancedOpen: false,
    advancedFilters: {
      name: "",
      type: "",
      author: ""
    }
  },
  remoteSearch: {
    quickKeyword: "",
    searchField: "name",
    advancedOpen: false,
    advancedFilters: {
      name: "",
      type: "",
      author: ""
    }
  },
  statusMessage: ""
});

export function reloadLocalBanks(): void {
  questionBankState.localBanks = loadBanks("local") as QuestionBankRecord[];
}

export function reloadRemoteBanksFromCache(): void {
  questionBankState.remoteBanks = loadBanks("remote") as QuestionBankRecord[];
}

export function initQuestionBankState(): void {
  reloadLocalBanks();
  reloadRemoteBanksFromCache();
}

export function removeLocal(id: string) {
  const result = deleteBankById("local", id);
  if (result.ok) {
    questionBankState.localBanks = result.banks as QuestionBankRecord[];
  }
  return result;
}
