<script setup>
import { ref } from "vue";
import AppName from "../components/AppName.vue";
import IntroFeatureCard from "../components/intro/IntroFeatureCard.vue";
import { appState } from "../state/appState";

const step1Ref = ref(null);
const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;

function scrollToStep1() {
  step1Ref.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="intro-page">
    <header class="intro-topbar">
      <div class="intro-container intro-topbar__inner">
        <router-link class="intro-topbar__brand" to="/home">
          <AppName />
        </router-link>
        <router-link class="intro-topbar__link" to="/home">
          前往首页<i class="fas fa-arrow-right ms-1"></i>
        </router-link>
      </div>
    </header>

    <section class="intro-section intro-section--hero">
      <div class="intro-container intro-container--hero">
      <div class="intro-hero-glow" aria-hidden="true"></div>
      <h1 class="intro-hero-title">
        <AppName />
      </h1>
      <p class="intro-hero-subtitle">帮助人们进行知识巩固的学习工具</p>
      <ul class="intro-hero-list">
        <li>把笔记整理成题集</li>
        <li>本地题库管理与远程下载</li>
        <li>做题练习、记录进度、随时复盘</li>
      </ul>
      <button type="button" class="intro-cta" @click="scrollToStep1">
        <i class="fas fa-chevron-down"></i>
        向下滑动查看详情
        <i class="fas fa-chevron-down"></i>
      </button>
      </div>
    </section>

    <section ref="step1Ref" class="intro-section intro-section--step1">
      <div class="intro-container">
      <p class="intro-section-label">Step 1</p>
      <h2 class="intro-section-title">题集录入</h2>
      <p class="intro-section-desc">手动整理笔记，或用 AI 对话快速出题，两种方式随时切换。</p>
      <div class="intro-feature-grid">
        <IntroFeatureCard
          icon="fas fa-keyboard"
          title="手动录入"
          desc="逐题填写 txt、配图与解析说明"
        />
        <IntroFeatureCard
          icon="fas fa-robot"
          title="AI 生成"
          desc="配置模型后，用自然语言描述即可出题"
        />
        <IntroFeatureCard
          icon="fas fa-image"
          title="题目配图"
          desc="支持为每道题附加示意图"
        />
        <IntroFeatureCard
          icon="fas fa-lightbulb"
          title="解析字段"
          desc="为每题补充讲解，方便复盘巩固"
        />
      </div>
      </div>
    </section>

    <section class="intro-section intro-section--step2">
      <div class="intro-container">
      <p class="intro-section-label">Step 2</p>
      <h2 class="intro-section-title">JSON 与题库</h2>
      <p class="intro-section-desc">一键生成标准题集 JSON，导入导出备份，或保存到浏览器本地题库。</p>
      <div class="intro-feature-grid">
        <IntroFeatureCard
          icon="fas fa-bolt"
          title="一键生成"
          desc="Step 1 录入完成后，一键转为标准 JSON"
        />
        <IntroFeatureCard
          icon="fas fa-file-import"
          title="导入合并"
          desc="加载本地 JSON，或合并多个题集文件"
        />
        <IntroFeatureCard
          icon="fas fa-save"
          title="保存与导出"
          desc="写入浏览器题库，或导出 .json 文件备份"
        />
        <IntroFeatureCard
          icon="fas fa-book"
          title="题库联动"
          desc="保存后进入题库页，继续管理与开练"
        />
      </div>
      </div>
    </section>

    <section class="intro-section intro-section--banks">
      <div class="intro-container">
      <p class="intro-section-label">题库与进度</p>
      <h2 class="intro-section-title">集中管理，随时续练</h2>
      <p class="intro-section-desc">本地题库与内置远程题库统一管理，未完成练习自动记录进度。</p>
      <div class="intro-feature-grid">
        <IntroFeatureCard
          icon="fas fa-folder-open"
          title="本地题库"
          desc="新增、编辑、搜索、删除本地题集"
          variant="dark"
        />
        <IntroFeatureCard
          icon="fas fa-cloud-download-alt"
          title="远程题库"
          desc="从内置网络题库下载到本地继续练"
          variant="dark"
        />
        <IntroFeatureCard
          icon="fas fa-history"
          title="题集进度"
          desc="查看未完成记录，一键回到上次位置"
          variant="dark"
        />
        <IntroFeatureCard
          icon="fas fa-search"
          title="快速检索"
          desc="按名称、科目、作者筛选题集"
          variant="dark"
        />
      </div>
      </div>
    </section>

    <section class="intro-section intro-section--step3">
      <div class="intro-container">
      <p class="intro-section-label">Step 3</p>
      <h2 class="intro-section-title">练习巩固</h2>
      <p class="intro-section-desc">在首页或独立练习页答题，结果实时记录，纯前端运行、数据保存在本地。</p>
      <div class="intro-feature-grid">
        <IntroFeatureCard
          icon="fas fa-pen"
          title="多种题型"
          desc="单选、多选、判断、填空等自动识别"
        />
        <IntroFeatureCard
          icon="fas fa-check-circle"
          title="即时判题"
          desc="提交后立刻看到对错与解析"
        />
        <IntroFeatureCard
          icon="fas fa-comments"
          title="AI 答疑"
          desc="练习时可就当前题目向 AI 提问"
        />
        <IntroFeatureCard
          icon="fas fa-database"
          title="本地同步"
          desc="进度写入 localStorage，刷新不丢失"
        />
      </div>
      </div>
    </section>

    <section class="intro-section intro-section--footer">
      <div class="intro-container intro-container--footer">
      <div class="intro-footer-actions">
        <router-link class="intro-btn intro-btn--primary" to="/home">
          <i class="fas fa-play me-1"></i>开始使用
        </router-link>
        <a class="intro-btn intro-btn--outline" :href="githubUrl" target="_blank" rel="noreferrer">
          <i class="fab fa-github me-1"></i>GitHub Star
        </a>
      </div>
      <p class="intro-footer-note">
        开源学习工具 · {{ appState.webSiteConfig.appAuthor.name }}
      </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro-page {
  width: 100%;
  min-height: 100dvh;
  color: #0f172a;
  background: #0a0a0a;
}

.intro-container {
  width: min(72rem, 100%);
  margin: 0 auto;
  padding-inline: clamp(1rem, 3vw, 2rem);
}

.intro-topbar {
  background: rgba(10, 10, 10, 0.82);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.intro-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.75rem;
}

.intro-topbar__link,
.intro-topbar__brand {
  color: #f8fafc;
  text-decoration: none;
  font-size: 0.9rem;
}

.intro-topbar__link:hover,
.intro-topbar__brand:hover {
  color: #93c5fd;
}

.intro-section {
  position: relative;
  padding-block: clamp(2rem, 5vw, 3.5rem);
  overflow: hidden;
}

.intro-section--hero {
  background: #0a0a0a;
  color: #f8fafc;
  text-align: center;
  padding-top: clamp(1.5rem, 4vw, 2.5rem);
  padding-bottom: clamp(2rem, 6vw, 3.5rem);
}

.intro-container--hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.intro-hero-glow {
  position: absolute;
  top: 2.5rem;
  left: 50%;
  width: 12rem;
  height: 12rem;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(168, 85, 247, 0.2) 45%, transparent 70%);
  filter: blur(8px);
  pointer-events: none;
}

.intro-hero-title {
  position: relative;
  margin: 0 0 0.75rem;
  font-size: clamp(1.85rem, 5vw + 0.5rem, 3rem);
  font-weight: 800;
  line-height: 1.15;
}

.intro-hero-subtitle {
  position: relative;
  margin: 0 auto 1.25rem;
  max-width: min(18rem, 100%);
  font-size: clamp(0.95rem, 1.5vw + 0.75rem, 1.15rem);
  line-height: 1.55;
  color: #cbd5e1;
}

.intro-hero-list {
  position: relative;
  margin: 0 auto 1.75rem;
  padding: 0;
  list-style: none;
  width: 100%;
  max-width: 52rem;
  color: #e2e8f0;
  font-size: clamp(0.85rem, 1vw + 0.75rem, 1rem);
  line-height: 1.7;
}

.intro-hero-list li {
  position: relative;
}

.intro-cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.25rem;
  background: #2563eb;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.35);
}

.intro-cta:hover {
  background: #1d4ed8;
}

.intro-section--step1 {
  background: #d8e8f8;
}

.intro-section--step2 {
  background: #e8ddd0;
}

.intro-section--banks {
  background: #4a82e8;
  color: #f8fafc;
}

.intro-section--step3 {
  background: #e8ecf0;
}

.intro-container--footer {
  text-align: center;
}

.intro-section--footer {
  background: linear-gradient(180deg, #d1e3f0 0%, #eef4f9 100%);
  text-align: center;
  padding-bottom: 3rem;
}

.intro-section-label {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.72;
}

.intro-section--banks .intro-section-label,
.intro-section--banks .intro-section-desc {
  color: rgba(248, 250, 252, 0.9);
}

.intro-section-title {
  margin: 0 0 0.6rem;
  font-size: clamp(1.35rem, 2vw + 1rem, 2rem);
  font-weight: 800;
  line-height: 1.25;
}

.intro-section--banks .intro-section-title {
  color: #fff;
}

.intro-section-desc {
  margin: 0 0 1.25rem;
  font-size: clamp(0.88rem, 1vw + 0.75rem, 1.05rem);
  line-height: 1.55;
  color: #334155;
  max-width: 42rem;
}

.intro-feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(0.75rem, 2vw, 1rem);
}

@media (min-width: 36rem) {
  .intro-hero-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem 1rem;
    text-align: center;
  }

  .intro-hero-list li {
    padding-left: 0;
  }

  .intro-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 62rem) {
  .intro-feature-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .intro-hero-glow {
    width: 16rem;
    height: 16rem;
  }
}

@media (min-width: 48rem) {
  .intro-section-desc {
    margin-bottom: 1.5rem;
  }

  .intro-hero-subtitle {
    max-width: 28rem;
  }
}

.intro-footer-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.intro-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.65rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.intro-btn--primary {
  background: #2563eb;
  color: #fff;
}

.intro-btn--primary:hover {
  background: #1d4ed8;
  color: #fff;
}

.intro-btn--outline {
  border: 1px solid #94a3b8;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.7);
}

.intro-btn--outline:hover {
  background: #fff;
  color: #0f172a;
}

.intro-footer-note {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
}
</style>
