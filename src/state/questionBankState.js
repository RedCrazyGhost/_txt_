import { reactive } from "vue";
import {
  deleteBankById,
  loadBanks
} from "../services/questionBank";

export const questionBankState = reactive({
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

export function reloadLocalBanks() {
  questionBankState.localBanks = loadBanks("local");
}

export function reloadRemoteBanksFromCache() {
  questionBankState.remoteBanks = loadBanks("remote");
}

export function initQuestionBankState() {
  reloadLocalBanks();
  reloadRemoteBanksFromCache();
}

export function removeLocal(id) {
  questionBankState.localBanks = deleteBankById("local", id);
}

