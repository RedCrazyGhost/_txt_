<script setup lang="ts">
import { appState } from "../../state/appState";

const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;
</script>

<template>
  <section class="card shadow-sm about-reveal">
    <div class="card-body text-center py-4">
      <h3 class="fs-5 mb-2">准备好开始了吗？</h3>
      <p class="text-muted mb-3">
        由 {{ appState.webSiteConfig.appAuthor.name }} 发起并持续维护
      </p>
      <div class="d-flex flex-wrap gap-2 justify-content-center mb-3">
        <router-link class="btn btn-primary" to="/home">
          <i class="fas fa-home me-1"></i>前往首页
        </router-link>
        <router-link class="btn btn-outline-secondary" to="/practice-progress">
          <i class="fas fa-tasks me-1"></i>题集进度
        </router-link>
      </div>
      <div class="small">
        <router-link to="/acknowledgements" class="text-decoration-none">鸣谢</router-link>
        <span class="text-muted mx-2">·</span>
        <a :href="githubUrl" target="_blank" rel="noreferrer" class="text-decoration-none">
          <i class="fab fa-github me-1"></i>GitHub
        </a>
      </div>
    </div>
    <div class="card-footer text-muted small text-center">
      _txt_ 为纯前端应用，题集与练习进度保存在浏览器 localStorage 中，建议定期导出 JSON 备份。
    </div>
  </section>
</template>
