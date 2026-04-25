<script setup>
import { computed } from "vue";
import { appState } from "../state/appState";

const currentYear = computed(() => new Date().getFullYear());
</script>

<template>
  <div class="container py-4 acknowledgements-page">
    <header class="mb-4">
      <h2 class="mb-1">鸣谢</h2>
      <p class="text-muted mb-0">感谢每一位使用者、贡献者与赞助者，让 _txt_ 持续迭代和改进。</p>
    </header>

    <section class="card shadow-sm mb-3">
      <div class="card-header">项目致谢</div>
      <div class="card-body">
        <p class="mb-2">
          _txt_ 由 <strong>{{ appState.webSiteConfig.appAuthor.name }}</strong> 发起并持续维护，
          旨在帮助学习者更高效地整理知识与练习题目。
        </p>
        <p class="mb-0">
          感谢所有提交反馈与建议的用户，你们的每一次使用都在推动产品变得更好。
        </p>
      </div>
    </section>

    <section class="card shadow-sm mb-3">
      <div class="card-header">开源依赖与生态</div>
      <div class="card-body">
        <ul class="mb-0 ps-3">
          <li><strong>Vue 3 + Vite / vite-ssg</strong>：页面构建、路由与静态站点生成。</li>
          <li><strong>Bootstrap 5</strong>：响应式布局与基础交互组件。</li>
          <li><strong>Font Awesome</strong>：界面图标支持。</li>
          <li><strong>Axios</strong>：题库数据请求与加载。</li>
          <li><strong>FileSaver</strong>：本地文件导出能力。</li>
          <li><strong>Intro.js</strong>：新手引导与步骤提示。</li>
        </ul>
      </div>
    </section>

    <section class="card shadow-sm mb-3">
      <div class="card-header">赞助与支持</div>
      <div class="card-body">
        <p class="mb-2">如果你觉得这个开源的帮助学习的网站还不错的话，欢迎在 GitHub 给项目一个 Star。</p>
        <p class="mb-3">
          可以在
          <a class="link-dark fw-semibold text-decoration-none" href="https://github.com/RedCrazyGhost/_txt_" target="_blank" rel="noreferrer">
            <i class="fab fa-github me-1"></i>GitHub
          </a>
          给这个开源项目一个 <i class="far fa-star text-warning"></i>
        </p>
        <p class="mb-2">赞助名单（按配置顺序展示）：</p>
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
          <div class="col" v-for="person in appState.webSiteConfig.appCoinPerson" :key="person.name">
            <div class="border rounded p-2 h-100 d-flex align-items-center gap-2">
              <img v-if="person.src" :src="person.src" alt="赞助者头像" class="rounded-circle acknowledgements-avatar" />
              <i v-else :class="`far fa-2x fa-${person.iclass || 'smile'}`"></i>
              <span>{{ person.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card shadow-sm">
      <div class="card-header">参与方式</div>
      <div class="card-body">
        <ul class="mb-3 ps-3">
          <li>在日常使用中提交问题与建议，帮助我们定位改进点。</li>
          <li>通过 GitHub Issue / PR 参与功能优化与缺陷修复。</li>
          <li>分享 _txt_ 给身边有学习巩固需求的朋友。</li>
        </ul>
        <a class="btn btn-outline-dark btn-sm" href="https://github.com/RedCrazyGhost/_txt_" target="_blank" rel="noreferrer">
          <i class="fab fa-github me-1"></i>前往 GitHub 仓库
        </a>
      </div>
      <div class="card-footer text-muted small">2021-{{ currentYear }} © {{ appState.webSiteConfig.appAuthor.name }}</div>
    </section>
  </div>
</template>

<style scoped>
.acknowledgements-avatar {
  width: 2rem;
  height: 2rem;
  object-fit: cover;
}
</style>
