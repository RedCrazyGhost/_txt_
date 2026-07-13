<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { appState } from "./state/appState";
import AppTopNav from "./components/AppTopNav.vue";
import AppBottomNav from "./components/AppBottomNav.vue";

const route = useRoute();
const isImmersive = computed(() => Boolean(route.meta?.immersive));
</script>

<template>
  <div
    class="app-root bg-body"
    :class="{ 'app-root--immersive': isImmersive }"
    :data-bs-theme="appState.webSiteConfig.appColor === 'dark' ? 'dark' : 'light'"
    :style="`font-family:${appState.webSiteConfig.appFontFamily};`"
  >
    <template v-if="isImmersive">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </template>
    <template v-else>
      <AppTopNav :state="appState" />
      <main class="app-main">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
      <AppBottomNav :state="appState" />
    </template>
  </div>
</template>

<style scoped>
/*
 * 至少占满一屏，避免 body 露白；不要用 flex 把 main 拉高，
 * 否则「主内容在上、空白在下」会挤在内容与页脚之间。
 * 多余高度留在页脚下方，由 app-root 背景色填满。
 */
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-main {
  flex: 1 0 auto;
}

.app-root--immersive {
  min-height: 100dvh;
}
</style>
