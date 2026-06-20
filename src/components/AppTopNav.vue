<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppName from "./AppName.vue";
import { listIncompleteRecords } from "../services/practiceProgress";
import {
  StorageChangeKind,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "../services/appStorageSync";
import { loadRemoteQuestionBanks } from "../services/remoteQuestionBanks";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState";

const props = defineProps({
  state: { type: Object, required: true }
});

const route = useRoute();
const incompleteCount = ref(0);

function refreshIncompleteCount() {
  if (typeof window === "undefined") return;
  const banks = [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  incompleteCount.value = listIncompleteRecords(banks).length;
}

function handleStorageChanged(event) {
  const kind = event?.detail?.kind;
  if (kind === StorageChangeKind.localBanks) {
    reloadLocalBanks();
    refreshIncompleteCount();
    return;
  }
  if (kind === StorageChangeKind.remoteBanks) {
    refreshIncompleteCount();
    return;
  }
  if (kind === StorageChangeKind.practiceProgress) {
    refreshIncompleteCount();
  }
}

onMounted(() => {
  reloadLocalBanks();
  loadRemoteQuestionBanks().finally(refreshIncompleteCount);
  subscribeStorageChanged(handleStorageChanged);
});

onBeforeUnmount(() => {
  unsubscribeStorageChanged(handleStorageChanged);
});

watch(
  () => route.fullPath,
  () => {
    refreshIncompleteCount();
  }
);

function judgeColorChangeFontColor(color) {
  return color === "light" ? "dark" : "light";
}

function changeAppColor() {
  props.state.webSiteConfig.appColor =
    props.state.webSiteConfig.appColor === "light" ? "dark" : "light";
}

function changeIClass() {
  return props.state.webSiteConfig.appColor === "light"
    ? "far fa-sun fa-spin fa-lg"
    : "fas fa-moon fa-lg";
}

function changeIStyle() {
  return props.state.webSiteConfig.appColor === "light"
    ? "color:var(--bs-warning)"
    : "color:var(--bs-primary)";
}
</script>

<template>
  <nav
    :class="`by-4 navbar navbar-expand-lg navbar-${state.webSiteConfig.appColor} bg-body app-chrome`"
  >
    <div class="container">
      <router-link class="navbar-brand" to="/home">
        <AppName />
      </router-link>
      <i :class="changeIClass()" :style="changeIStyle()" @click="changeAppColor"></i>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav" style="margin-left: auto">
          <li class="nav-item" v-for="router in state.webSiteConfig.appRouters" :key="router.to">
            <router-link
              :to="router.to"
              :class="`nav-link nav-link-with-badge ${$route.name === router.name ? 'active' : ''}`"
            >
              {{ router.label || router.name }}
              <span
                v-if="router.name === 'PracticeProgress' && incompleteCount > 0"
                class="nav-progress-badge"
                :aria-label="`${incompleteCount} 份未完成题集进度`"
              >
                {{ incompleteCount > 99 ? "99+" : incompleteCount }}
              </span>
            </router-link>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              href="https://github.com/RedCrazyGhost/_txt_"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 仓库"
              title="GitHub"
            >
              <i class="fab fa-github fa-lg"></i>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link-with-badge {
  position: relative;
  padding-right: 1.35rem;
}

.nav-progress-badge {
  position: absolute;
  top: 0.2rem;
  right: 0;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--bs-danger);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}
</style>
