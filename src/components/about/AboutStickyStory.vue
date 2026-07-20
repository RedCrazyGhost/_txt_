<script setup lang="ts">
const chapters = [
  {
    eyebrow: "编辑",
    title: "把笔记，变成题目。",
    desc: "手动输入或使用 AI 辅助生成，实时预览单选、多选与填空效果。所见即所得，无需切换工具。",
    visual: "editor"
  },
  {
    eyebrow: "题库",
    title: "你的题库，触手可及。",
    desc: "本地新增、编辑与搜索；也可从内置远程题库下载。题集 JSON 一键导入导出，备份与分享都简单。",
    visual: "bank"
  },
  {
    eyebrow: "练习",
    title: "练习，直到掌握。",
    desc: "选择题集即开即练，答题进度自动保存。随时复盘错题，从上次离开的地方继续。",
    visual: "practice"
  }
];

const bankItems = ["高等数学", "计算机网络", "英语词汇"];
</script>

<template>
  <section class="about-sticky">
    <div class="about-sticky__intro about-reveal">
      <p class="about-eyebrow about-eyebrow--center">核心能力</p>
      <h2 class="about-sticky__intro-title">为学习而生。</h2>
      <p class="about-sticky__intro-desc">
        编辑、管理、练习三步闭环，让知识巩固回归简单高效。
      </p>
    </div>

    <div class="about-sticky__track">
      <article
        v-for="chapter in chapters"
        :key="chapter.eyebrow"
        class="about-sticky__chapter about-reveal"
      >
        <div class="about-sticky__panel">
          <p class="about-eyebrow">{{ chapter.eyebrow }}</p>
          <h3 class="about-sticky__chapter-title">{{ chapter.title }}</h3>
          <p class="about-sticky__chapter-desc">{{ chapter.desc }}</p>
        </div>

        <div class="about-sticky__visual">
          <div v-if="chapter.visual === 'editor'" class="about-mock about-mock--editor">
            <div class="about-mock__toolbar">
              <span></span><span></span><span></span>
            </div>
            <div class="about-mock__body">
              <div class="about-mock__line"><span class="about-mock__num">1</span>1+1=_2_</div>
              <div class="about-mock__line about-mock__line--dim">
                <span class="about-mock__num">2</span>水的化学式是_H2O_
              </div>
              <div class="about-mock__line">
                <span class="about-mock__num">3</span>Vue 是 _[A]框架 [B]数据库_
              </div>
            </div>
            <div class="about-mock__preview">
              <div class="about-mock__preview-label">实时预览</div>
              <div class="about-mock__option about-mock__option--active">A. 前端</div>
              <div class="about-mock__option">B. 数据库</div>
            </div>
          </div>

          <div v-else-if="chapter.visual === 'bank'" class="about-mock about-mock--bank">
            <div v-for="item in bankItems" :key="item" class="about-mock__bank-item">
              <div class="about-mock__bank-icon">题</div>
              <div class="about-mock__bank-info">
                <span class="about-mock__bank-name">{{ item }}</span>
                <span class="about-mock__bank-meta">128 题 · 本地</span>
              </div>
              <span class="about-mock__bank-arrow">›</span>
            </div>
          </div>

          <div v-else class="about-mock about-mock--practice">
            <div class="about-mock__progress-ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" class="about-mock__ring-bg" />
                <circle cx="50" cy="50" r="42" class="about-mock__ring-fill" />
              </svg>
              <span class="about-mock__progress-num">73%</span>
            </div>
            <div class="about-mock__stats">
              <div><strong>22</strong><span>已答</span></div>
              <div><strong>8</strong><span>正确</span></div>
              <div><strong>30</strong><span>总计</span></div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
