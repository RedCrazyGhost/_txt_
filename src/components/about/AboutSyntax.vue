<script setup lang="ts">
const examples = [
  { label: "填空题", code: "1+1=_2_" },
  { label: "单选题", code: "Vue 是 _[A]前端框架 [B]数据库_" },
  { label: "多段填空", code: "水的化学式是_H2O_，沸点是_100_℃" }
];
</script>

<template>
  <section class="about-syntax about-reveal">
    <div class="about-syntax__header">
      <h2 class="about-syntax__title">独特的题目语法</h2>
      <p class="about-syntax__sub">
        用下划线标记答案，方括号标记选项 — _txt_ 的核心编辑体验
      </p>
    </div>
    <div class="about-syntax__grid">
      <div v-for="example in examples" :key="example.label" class="about-syntax-block">
        <div class="about-syntax-block__label">{{ example.label }}</div>
        <pre class="about-syntax-block__code">{{ example.code }}</pre>
      </div>
    </div>
  </section>
</template>
