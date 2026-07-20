<script setup lang="ts">
const pillars = [
  {
    num: 1,
    title: "编辑",
    desc: "手动输入或 AI 辅助生成，实时预览填空、单选与多选。",
    link: { to: "/home", label: "前往首页" }
  },
  {
    num: 2,
    title: "题库",
    desc: "本地管理题集，支持 JSON 导入导出与远程题库下载。",
    link: { to: "/question-bank", label: "打开题库" }
  },
  {
    num: 3,
    title: "练习",
    desc: "选择题集即开即练，进度自动保存，随时复盘继续。",
    link: { to: "/practice-progress", label: "查看进度" }
  }
];
</script>

<template>
  <section class="about-pillars about-reveal">
    <div class="about-pillars__header">
      <h2 class="about-pillars__title">三步，完成闭环</h2>
      <p class="about-pillars__sub">编辑、管理、练习 — 学习巩固的完整路径</p>
    </div>
    <div class="about-pillars__grid">
      <article v-for="pillar in pillars" :key="pillar.num" class="about-pillar">
        <span class="about-pillar__num">{{ pillar.num }}</span>
        <h3 class="about-pillar__title">{{ pillar.title }}</h3>
        <p class="about-pillar__desc">{{ pillar.desc }}</p>
        <router-link :to="pillar.link.to" class="btn btn-sm btn-outline-primary">
          {{ pillar.link.label }}
        </router-link>
      </article>
    </div>
  </section>
</template>
