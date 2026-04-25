<script setup>
import { appState } from "./state/appState";
import AppTopNav from "./components/AppTopNav.vue";
import AppBottomNav from "./components/AppBottomNav.vue";

function judgeColorChangeFontColor(color) {
  return color === "light" ? "dark" : "light";
}
</script>

<template>
  <div
    :class="[
      'app-root',
      `bg-${appState.webSiteConfig.appColor}`,
      `text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`
    ]"
    :style="`font-family:${appState.webSiteConfig.appFontFamily};`"
  >
    <AppTopNav :state="appState" />
    <main class="app-main">
      <keep-alive>
        <router-view />
      </keep-alive>
    </main>
    <AppBottomNav :state="appState" />
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
</style>
