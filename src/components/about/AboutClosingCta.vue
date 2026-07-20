<script setup lang="ts">
import { getTimeYYYY } from "../../utils/time";
import { appState } from "../../state/appState";

const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;
const gaIconUrl = `${import.meta.env.BASE_URL}images/AppGA.png`;
const currentYear = getTimeYYYY(new Date());
</script>

<template>
  <section class="about-closing">
    <div class="about-closing__inner about-reveal">
      <h2 class="about-closing__title">准备好开始了吗？</h2>
      <p class="about-closing__sub">
        由 {{ appState.webSiteConfig.appAuthor.name }} 发起并持续维护
      </p>
      <div class="about-closing__actions">
        <router-link class="about-cta about-cta--primary" to="/home">前往首页</router-link>
        <router-link class="about-cta about-cta--outline" to="/practice-progress">题集进度</router-link>
      </div>
      <div class="about-closing__links">
        <router-link to="/acknowledgements">鸣谢</router-link>
        <span aria-hidden="true">·</span>
        <a :href="githubUrl" target="_blank" rel="noreferrer">GitHub</a>
      </div>
      <div class="about-closing__legal">
        <span>2021-{{ currentYear }} © {{ appState.webSiteConfig.appAuthor.name }}</span>
        <a href="http://beian.miit.gov.cn/" target="_blank" rel="noreferrer">鄂ICP备19031343号-1</a>
        <a
          href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42020202000140"
          target="_blank"
          rel="noreferrer"
        >
          <img :src="gaIconUrl" alt="" />鄂公网安备 42020202000140号
        </a>
        <span>Web Site Version: {{ appState.webSiteConfig.appVersion }}</span>
      </div>
    </div>
  </section>
</template>
