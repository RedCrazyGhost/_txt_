import { ref } from "vue";
import { useRouter, type Router } from "vue-router";
import {
  inspectIncompletePractice,
  resumeNotebookAndGo,
  startNewPracticeFromBank,
  type PracticeBankInput
} from "../services/practiceSession";
import type { BankLike, EnrichedNotebook } from "../services/practiceProgress";
import { questionBankState } from "../state/questionBankState";

export function useStartPracticeChoice() {
  const router = useRouter();
  const visible = ref(false);
  const pendingBank = ref<PracticeBankInput | null>(null);
  const latest = ref<EnrichedNotebook | null>(null);
  const incompleteCount = ref(0);
  let pendingRouter: Router | null = null;

  function getAllBanks(): BankLike[] {
    return [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  }

  function requestStart(bank: PracticeBankInput, targetRouter: Router = router) {
    const choice = inspectIncompletePractice(bank.id, getAllBanks());
    if (!choice) {
      startNewPracticeFromBank(bank, targetRouter);
      return;
    }
    pendingBank.value = bank;
    latest.value = choice.latest;
    incompleteCount.value = choice.incompleteCount;
    pendingRouter = targetRouter;
    visible.value = true;
  }

  function resumeLatest() {
    if (!latest.value) return;
    resumeNotebookAndGo(latest.value, getAllBanks(), pendingRouter ?? router);
    visible.value = false;
  }

  function createNew() {
    if (!pendingBank.value) return;
    startNewPracticeFromBank(pendingBank.value, pendingRouter ?? router);
    visible.value = false;
  }

  function cancel() {
    visible.value = false;
    pendingBank.value = null;
    latest.value = null;
  }

  return {
    visible,
    pendingBank,
    latest,
    incompleteCount,
    requestStart,
    resumeLatest,
    createNew,
    cancel
  };
}
