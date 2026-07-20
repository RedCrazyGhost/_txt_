<script setup lang="ts">
const steps = [
  {
    num: 1,
    title: "Step 1 — 编辑题目",
    desc: "在首页手动输入题目文本，或使用 AI 辅助生成。支持填空、单选、多选等格式，实时预览效果。",
    link: { to: "/home", label: "前往首页编辑" }
  },
  {
    num: 2,
    title: "Step 2 — 导出 JSON",
    desc: "将题集导出为 JSON 文件备份，或保存到浏览器本地题库，便于分享与迁移。",
    link: { to: "/question-bank", label: "打开题库管理" }
  },
  {
    num: 3,
    title: "Step 3 — 开始练习",
    desc: "从题库选择题集进入练习页，答题进度自动保存，可随时复盘与继续。",
    link: { to: "/practice-progress", label: "查看题集进度" }
  }
];
</script>

<template>
  <section class="mb-4 about-reveal">
    <h3 class="fs-5 mb-3">使用流程</h3>
    <div class="about-workflow">
      <article v-for="step in steps" :key="step.num" class="about-workflow__step">
        <span class="about-workflow__badge">{{ step.num }}</span>
        <div class="about-workflow__body">
          <h4 class="about-workflow__title">{{ step.title }}</h4>
          <p class="about-workflow__desc mb-0">{{ step.desc }}</p>
          <router-link :to="step.link.to" class="btn btn-sm btn-outline-primary mt-2">
            {{ step.link.label }}
          </router-link>
        </div>
      </article>
    </div>
  </section>
</template>
