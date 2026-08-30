<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppName from "./AppName.vue";
import { listActionableNotebooks, type BankLike } from "../services/practiceProgress";
import {
  StorageChangeKind,
  subscribeStorageChanged,
  unsubscribeStorageChanged
} from "../services/appStorageSync";
import { loadRemoteQuestionBanks } from "../services/remoteQuestionBanks";
import { reloadLocalBanks, questionBankState } from "../state/questionBankState";
import { setTheme } from "../services/appPrefsStorage";
import type { AppState } from "../state/appState";
import gearComplexUrl from "../assets/icons/gear-complex.svg";

const props = defineProps<{
  state: AppState;
}>();

const route = useRoute();
const actionableCount = ref(0);
const isLightTheme = computed(() => props.state.webSiteConfig.appColor === "light");

function refreshIncompleteCount() {
  if (typeof window === "undefined") return;
  const banks = [...questionBankState.localBanks, ...questionBankState.remoteBanks];
  actionableCount.value = listActionableNotebooks(banks as BankLike[]).length;
}

function handleStorageChanged(event: Event) {
  const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
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

function judgeColorChangeFontColor(color: string) {
  return color === "light" ? "dark" : "light";
}

function changeAppColor() {
  const next =
    props.state.webSiteConfig.appColor === "light" ? "dark" : "light";
  const prefs = setTheme(next);
  props.state.webSiteConfig.appColor = prefs.theme;
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
      <button
        type="button"
        class="theme-toggle"
        :class="{ 'theme-toggle--sun': isLightTheme }"
        :style="isLightTheme ? 'color:var(--bs-warning)' : 'color:var(--bs-primary)'"
        :aria-label="isLightTheme ? '切换到深色主题' : '切换到浅色主题'"
        :title="isLightTheme ? '切换到深色主题' : '切换到浅色主题'"
        @click="changeAppColor"
      >
        <i
          v-if="isLightTheme"
          class="fa-regular fa-sun fa-lg"
          aria-hidden="true"
        ></i>
        <i v-else class="fas fa-moon fa-lg" aria-hidden="true"></i>
      </button>
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
              :class="[
                'nav-link',
                { 'nav-link-with-badge': router.name === 'PracticeProgress' },
                { active: $route.name === router.name }
              ]"
            >
              <template v-if="router.name === 'Settings'">
                <span class="nav-settings-link">
                  <span
                    class="nav-settings-icon"
                    :style="{
                      maskImage: `url(${gearComplexUrl})`,
                      WebkitMaskImage: `url(${gearComplexUrl})`
                    }"
                    aria-hidden="true"
                  ></span>
                  <span class="nav-settings-label">配置</span>
                </span>
              </template>
              <template v-else>
                {{ router.label || router.name }}
                <span
                  v-if="router.name === 'PracticeProgress' && actionableCount > 0"
                  class="nav-progress-badge"
                  :aria-label="`${actionableCount} 本未完成做题记录`"
                >
                  {{ actionableCount > 99 ? "99+" : actionableCount }}
                </span>
              </template>
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
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 1;
}

.theme-toggle--sun {
  animation: theme-sun-spin 16s linear infinite;
}

@keyframes theme-sun-spin {
  to {
    transform: rotate(360deg);
  }
}

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

.nav-settings-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1;
  vertical-align: middle;
}

.nav-settings-icon {
  flex: 0 0 auto;
  display: block;
  width: 1em;
  height: 1em;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  /* 光学校正：mask 图标视觉重心略偏下 */
  transform: translateY(-0.06em);
}

.nav-settings-label {
  line-height: 1;
}
</style>
