<script setup lang="ts">
import { appState } from "../../state/appState";

const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;
</script>

<template>
  <section class="about-cta-section about-reveal">
    <h2 class="about-cta-section__title">准备好开始了吗？</h2>
    <p class="about-cta-section__sub">
      由 {{ appState.webSiteConfig.appAuthor.name }} 发起并持续维护
    </p>
    <div class="about-cta-section__actions">
      <router-link class="btn btn-primary" to="/home">前往首页</router-link>
      <router-link class="btn btn-outline-secondary" to="/practice-progress">题集进度</router-link>
    </div>
    <div class="about-cta-section__links">
      <router-link to="/acknowledgements">鸣谢</router-link>
      <span class="text-muted mx-2">·</span>
      <a :href="githubUrl" target="_blank" rel="noreferrer">GitHub</a>
    </div>
    <p class="about-cta-section__note">
      _txt_ 为纯前端应用，题集与练习进度保存在浏览器 localStorage 中，建议定期导出 JSON 备份。
    </p>
  </section>
</template>
