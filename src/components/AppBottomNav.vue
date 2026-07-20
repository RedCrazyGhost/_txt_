<script setup lang="ts">
import { getTimeYYYY } from "../utils/time";
import type { AppState } from "../state/appState";

defineProps<{
  state: AppState;
}>();

const gaIconUrl = `${import.meta.env.BASE_URL}images/AppGA.png`;
</script>

<template>
  <nav :class="`by-4 navbar navbar-${state.webSiteConfig.appColor} bg-body app-chrome`">
    <div class="container">
      <span class="navbar-text"
        >2021-{{ getTimeYYYY(new Date()) }} © {{ state.webSiteConfig.appAuthor.name }}</span
      >
      <a class="nav-link navbar-text" href="http://beian.miit.gov.cn/">鄂ICP备19031343号-1</a>
      <a
        class="nav-link navbar-text"
        target="_blank"
        rel="noreferrer"
        href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42020202000140"
      >
        <img :src="gaIconUrl" style="float: left" />鄂公网安备 42020202000140号
      </a>
      <span class="navbar-text">Web Site Version:{{ state.webSiteConfig.appVersion }}</span>
    </div>
  </nav>
</template>
