<script setup lang="ts">
const cards = [
  {
    label: "Step 1",
    title: "编辑题目",
    desc: "在首页手动输入或使用 AI 生成，实时预览题目效果。",
    wide: false
  },
  {
    label: "Step 2",
    title: "导出与备份",
    desc: "保存到本地题库，或导出 JSON 文件便于分享。",
    wide: false
  },
  {
    label: "Step 3",
    title: "开始练习",
    desc: "选择题集进入练习，进度自动保存，随时继续。",
    wide: false
  },
  {
    label: "格式",
    title: "QuestionJSON 统一结构",
    descParts: [
      "题集采用统一 JSON 格式（",
      { code: "version" },
      "、",
      { code: "name" },
      "、",
      { code: "type" },
      "、",
      { code: "author" },
      "、",
      { code: "questions" },
      "），便于导入导出与跨题集协作。"
    ],
    wide: true
  }
];
</script>

<template>
  <section class="about-bento">
    <div class="about-bento__header about-reveal">
      <p class="about-eyebrow about-eyebrow--center">三步上手</p>
      <h2 class="about-bento__title">简单，却不简陋。</h2>
      <p class="about-bento__sub">从创建到练习，流程清晰，上手即用。</p>
    </div>

    <div class="about-bento__grid">
      <article
        v-for="card in cards"
        :key="card.title"
        class="about-bento__card about-reveal"
        :class="{ 'about-bento__card--wide': card.wide }"
      >
        <p class="about-bento__card-label">{{ card.label }}</p>
        <h3 class="about-bento__card-title">{{ card.title }}</h3>
        <p v-if="card.desc" class="about-bento__card-desc">{{ card.desc }}</p>
        <p v-else class="about-bento__card-desc">
          <template v-for="(part, index) in card.descParts" :key="index">
            <code v-if="typeof part === 'object'">{{ part.code }}</code>
            <template v-else>{{ part }}</template>
          </template>
        </p>
      </article>
    </div>
  </section>
</template>
