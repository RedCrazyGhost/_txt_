<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import AppName from "../components/AppName.vue";
import { appState } from "../state/appState";

type AboutFeatureVisual = "editor" | "bank" | "practice";

interface AboutFeature {
  eyebrow: string;
  title: string;
  desc: string;
  visual: AboutFeatureVisual;
}

interface PrivacyPoint {
  icon: string;
  title: string;
  desc: string;
}

const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;
const homeScreenshot = `${import.meta.env.BASE_URL}images/home.png`;

const features: AboutFeature[] = [
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

const privacyPoints: PrivacyPoint[] = [
  { icon: "fa-laptop", title: "纯前端", desc: "无需安装，打开浏览器即可使用" },
  { icon: "fa-shield-alt", title: "本地存储", desc: "数据保存在你的设备，不上传服务器" },
  { icon: "fa-bolt", title: "即时同步", desc: "修改立即反映，同一浏览器内无缝衔接" }
];

let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("about-reveal--visible");
          observer?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll(".about-reveal").forEach((el) => observer?.observe(el));
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <div class="about-page">
    <!-- Hero -->
    <section class="about-hero">
      <div class="about-hero__glow" aria-hidden="true"></div>
      <div class="about-hero__content about-reveal">
        <p class="about-eyebrow">应用介绍</p>
        <h1 class="about-hero__title">
          <AppName />
        </h1>
        <p class="about-hero__headline">知识巩固，从此简单。</p>
        <p class="about-hero__sub">
          将知识点整理为题集，通过反复练习真正掌握。
          <br class="about-br-desktop" />
          在浏览器中完成编辑、管理与练习，无需额外软件。
        </p>
        <div class="about-hero__actions">
          <router-link class="about-cta about-cta--primary" to="/home">开始制作</router-link>
          <router-link class="about-cta about-cta--ghost" to="/question-bank">浏览题库</router-link>
        </div>
      </div>
      <div class="about-hero__scroll-hint" aria-hidden="true">
        <span></span>
      </div>
    </section>

    <!-- Product shot -->
    <section class="about-showcase">
      <div class="about-showcase__frame about-reveal">
        <img
          :src="homeScreenshot"
          alt="_txt_ 首页界面预览"
          class="about-showcase__img"
          loading="lazy"
        />
      </div>
      <p class="about-showcase__caption about-reveal">
        从编辑到预览，一切在一个页面完成。
      </p>
    </section>

    <!-- Feature sections -->
    <section
      v-for="(feature, index) in features"
      :key="feature.eyebrow"
      class="about-feature"
      :class="{ 'about-feature--reverse': index % 2 === 1 }"
    >
      <div class="about-feature__text about-reveal">
        <p class="about-eyebrow">{{ feature.eyebrow }}</p>
        <h2 class="about-feature__title">{{ feature.title }}</h2>
        <p class="about-feature__desc">{{ feature.desc }}</p>
      </div>
      <div class="about-feature__visual about-reveal" :data-visual="feature.visual">
        <!-- Editor mock -->
        <div v-if="feature.visual === 'editor'" class="about-mock about-mock--editor">
          <div class="about-mock__toolbar">
            <span></span><span></span><span></span>
          </div>
          <div class="about-mock__body">
            <div class="about-mock__line"><span class="about-mock__num">1</span>1+1=_2_</div>
            <div class="about-mock__line about-mock__line--dim"><span class="about-mock__num">2</span>水的化学式是_H2O_</div>
            <div class="about-mock__line"><span class="about-mock__num">3</span>Vue 是 _[A]框架 [B]数据库_</div>
          </div>
          <div class="about-mock__preview">
            <div class="about-mock__preview-label">实时预览</div>
            <div class="about-mock__option about-mock__option--active">A. 前端</div>
            <div class="about-mock__option">B. 数据库</div>
          </div>
        </div>

        <!-- Bank mock -->
        <div v-else-if="feature.visual === 'bank'" class="about-mock about-mock--bank">
          <div v-for="item in ['高等数学', '计算机网络', '英语词汇']" :key="item" class="about-mock__bank-item">
            <div class="about-mock__bank-icon"><i class="fas fa-book"></i></div>
            <div class="about-mock__bank-info">
              <span class="about-mock__bank-name">{{ item }}</span>
              <span class="about-mock__bank-meta">128 题 · 本地</span>
            </div>
            <i class="fas fa-chevron-right about-mock__bank-arrow"></i>
          </div>
        </div>

        <!-- Practice mock -->
        <div v-else class="about-mock about-mock--practice">
          <div class="about-mock__progress-ring">
            <svg viewBox="0 0 100 100">
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
    </section>

    <!-- Workflow -->
    <section class="about-workflow">
      <div class="about-workflow__inner about-reveal">
        <p class="about-eyebrow about-eyebrow--center">三步上手</p>
        <h2 class="about-workflow__title">简单，却不简陋。</h2>
        <div class="about-workflow__steps">
          <div class="about-workflow__step">
            <span class="about-workflow__num">1</span>
            <h3>编辑题目</h3>
            <p>在首页输入或使用 AI 生成题目文本</p>
          </div>
          <div class="about-workflow__connector" aria-hidden="true"></div>
          <div class="about-workflow__step">
            <span class="about-workflow__num">2</span>
            <h3>导出 JSON</h3>
            <p>保存到本地题库或导出文件备份</p>
          </div>
          <div class="about-workflow__connector" aria-hidden="true"></div>
          <div class="about-workflow__step">
            <span class="about-workflow__num">3</span>
            <h3>开始练习</h3>
            <p>选择题集，进度自动保存与恢复</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Privacy band -->
    <section class="about-privacy">
      <div class="about-privacy__inner about-reveal">
        <p class="about-eyebrow about-eyebrow--light">数据与隐私</p>
        <h2 class="about-privacy__title">数据留在本地。</h2>
        <p class="about-privacy__sub">
          无账号体系，不自动上传。你的题集与练习进度，只属于你。
        </p>
        <div class="about-privacy__grid">
          <div v-for="point in privacyPoints" :key="point.title" class="about-privacy__card">
            <i :class="`fas ${point.icon} about-privacy__icon`"></i>
            <h3>{{ point.title }}</h3>
            <p>{{ point.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="about-footer">
      <div class="about-footer__inner about-reveal">
        <h2 class="about-footer__title">准备好开始了吗？</h2>
        <p class="about-footer__sub">
          由 {{ appState.webSiteConfig.appAuthor.name }} 发起并持续维护
        </p>
        <div class="about-footer__actions">
          <router-link class="about-cta about-cta--primary" to="/home">前往首页</router-link>
          <router-link class="about-cta about-cta--outline" to="/practice-progress">题集进度</router-link>
        </div>
        <div class="about-footer__links">
          <router-link to="/acknowledgements">鸣谢</router-link>
          <span aria-hidden="true">·</span>
          <a :href="githubUrl" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  --about-accent: #0071e3;
  --about-accent-hover: #0077ed;
  --about-text: #1d1d1f;
  --about-text-secondary: #6e6e73;
  --about-bg: #fbfbfd;
  --about-surface: #ffffff;
  --about-border: rgba(0, 0, 0, 0.08);
  --about-hero-gradient: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0, 113, 227, 0.12), transparent);

  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: var(--about-text);
  background: var(--about-bg);
  overflow-x: hidden;
  letter-spacing: -0.01em;
}

[data-bs-theme="dark"] .about-page {
  --about-accent: #2997ff;
  --about-accent-hover: #40a9ff;
  --about-text: #f5f5f7;
  --about-text-secondary: #a1a1a6;
  --about-bg: #000000;
  --about-surface: #1d1d1f;
  --about-border: rgba(255, 255, 255, 0.1);
  --about-hero-gradient: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(41, 151, 255, 0.15), transparent);
}

/* Reveal animation */
.about-reveal {
  opacity: 0;
  transform: translateY(2.5rem);
  transition:
    opacity 0.9s cubic-bezier(0.25, 0.1, 0.25, 1),
    transform 0.9s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.about-reveal--visible {
  opacity: 1;
  transform: translateY(0);
}

/* Typography helpers */
.about-eyebrow {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--about-accent);
  margin-bottom: 0.75rem;
}

.about-eyebrow--center {
  text-align: center;
}

.about-eyebrow--light {
  color: rgba(255, 255, 255, 0.7);
}

.about-br-desktop {
  display: none;
}

/* Hero */
.about-hero {
  position: relative;
  min-height: calc(100dvh - 3.5rem - var(--app-bottom-nav-height, 3.75rem));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 1.5rem 3rem;
}

.about-hero__glow {
  position: absolute;
  inset: 0;
  background: var(--about-hero-gradient);
  pointer-events: none;
}

.about-hero__content {
  position: relative;
  max-width: 52rem;
}

.about-hero__title {
  font-size: clamp(3rem, 10vw, 5.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
  margin-bottom: 0.5rem;
}

.about-hero__headline {
  font-size: clamp(1.75rem, 5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 1.25rem;
}

.about-hero__sub {
  font-size: clamp(1.0625rem, 2.5vw, 1.3125rem);
  line-height: 1.6;
  color: var(--about-text-secondary);
  max-width: 36rem;
  margin: 0 auto 2.5rem;
}

.about-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.about-hero__scroll-hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
}

.about-hero__scroll-hint span {
  display: block;
  width: 1.25rem;
  height: 2.25rem;
  border: 2px solid var(--about-text-secondary);
  border-radius: 1rem;
  opacity: 0.4;
  position: relative;
}

.about-hero__scroll-hint span::after {
  content: "";
  position: absolute;
  top: 0.35rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0.25rem;
  height: 0.5rem;
  background: var(--about-text-secondary);
  border-radius: 0.125rem;
  animation: about-scroll-bounce 2s ease-in-out infinite;
}

@keyframes about-scroll-bounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) translateY(0.5rem);
    opacity: 0.3;
  }
}

/* CTAs */
.about-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.625rem;
  border-radius: 980px;
  font-size: 1.0625rem;
  font-weight: 400;
  text-decoration: none;
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    border-color 0.25s ease,
    transform 0.2s ease;
}

.about-cta:hover {
  transform: scale(1.02);
}

.about-cta--primary {
  background: var(--about-accent);
  color: #ffffff;
}

.about-cta--primary:hover {
  background: var(--about-accent-hover);
  color: #ffffff;
}

.about-cta--ghost {
  color: var(--about-accent);
  background: transparent;
}

.about-cta--ghost:hover {
  text-decoration: underline;
}

.about-cta--outline {
  border: 1px solid var(--about-border);
  color: var(--about-text);
  background: var(--about-surface);
}

.about-cta--outline:hover {
  border-color: var(--about-text-secondary);
  color: var(--about-text);
}

/* Showcase */
.about-showcase {
  padding: 2rem 1.5rem 6rem;
  text-align: center;
}

.about-showcase__frame {
  max-width: 64rem;
  margin: 0 auto;
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 24px 80px rgba(0, 0, 0, 0.12);
  background: var(--about-surface);
}

[data-bs-theme="dark"] .about-showcase__frame {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 24px 80px rgba(0, 0, 0, 0.5);
}

.about-showcase__img {
  display: block;
  width: 100%;
  height: auto;
}

.about-showcase__caption {
  margin-top: 1.5rem;
  font-size: 1.0625rem;
  color: var(--about-text-secondary);
}

/* Features */
.about-feature {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  align-items: center;
  max-width: 64rem;
  margin: 0 auto;
  padding: 5rem 1.5rem;
}

.about-feature__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.about-feature__desc {
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--about-text-secondary);
  max-width: 28rem;
}

/* Mocks */
.about-mock {
  border-radius: 1.25rem;
  background: var(--about-surface);
  border: 1px solid var(--about-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

[data-bs-theme="dark"] .about-mock {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.about-mock--editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 14rem;
}

.about-mock__toolbar {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--about-border);
}

.about-mock__toolbar span {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--about-border);
}

.about-mock__toolbar span:first-child {
  background: #ff5f57;
}

.about-mock__toolbar span:nth-child(2) {
  background: #febc2e;
}

.about-mock__toolbar span:nth-child(3) {
  background: #28c840;
}

.about-mock__body {
  padding: 1rem;
  font-family: "SF Mono", "Menlo", "Consolas", monospace;
  font-size: 0.8125rem;
  border-right: 1px solid var(--about-border);
}

.about-mock__line {
  display: flex;
  gap: 0.75rem;
  padding: 0.35rem 0;
  color: var(--about-text);
}

.about-mock__line--dim {
  opacity: 0.45;
}

.about-mock__num {
  color: var(--about-text-secondary);
  min-width: 1rem;
  text-align: right;
  user-select: none;
}

.about-mock__preview {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.about-mock__preview-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--about-text-secondary);
  margin-bottom: 0.25rem;
}

.about-mock__option {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid var(--about-border);
}

.about-mock__option--active {
  border-color: var(--about-accent);
  background: rgba(0, 113, 227, 0.08);
  color: var(--about-accent);
}

.about-mock--bank {
  padding: 0.5rem;
}

.about-mock__bank-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  transition: background 0.2s ease;
}

.about-mock__bank-item:hover {
  background: rgba(0, 113, 227, 0.05);
}

.about-mock__bank-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: rgba(0, 113, 227, 0.1);
  color: var(--about-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.about-mock__bank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.about-mock__bank-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.about-mock__bank-meta {
  font-size: 0.75rem;
  color: var(--about-text-secondary);
}

.about-mock__bank-arrow {
  font-size: 0.75rem;
  color: var(--about-text-secondary);
}

.about-mock--practice {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.about-mock__progress-ring {
  position: relative;
  width: 8rem;
  height: 8rem;
}

.about-mock__progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.about-mock__ring-bg {
  fill: none;
  stroke: var(--about-border);
  stroke-width: 6;
}

.about-mock__ring-fill {
  fill: none;
  stroke: var(--about-accent);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 264;
  stroke-dashoffset: 71;
}

.about-mock__progress-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.about-mock__stats {
  display: flex;
  gap: 2rem;
  text-align: center;
}

.about-mock__stats div {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.about-mock__stats strong {
  font-size: 1.25rem;
  font-weight: 700;
}

.about-mock__stats span {
  font-size: 0.75rem;
  color: var(--about-text-secondary);
}

/* Workflow */
.about-workflow {
  padding: 6rem 1.5rem;
  background: var(--about-surface);
  border-top: 1px solid var(--about-border);
  border-bottom: 1px solid var(--about-border);
}

.about-workflow__inner {
  max-width: 56rem;
  margin: 0 auto;
  text-align: center;
}

.about-workflow__title {
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 3.5rem;
}

.about-workflow__steps {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.about-workflow__step {
  text-align: center;
}

.about-workflow__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--about-accent);
  color: #ffffff;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.about-workflow__step h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.about-workflow__step p {
  font-size: 0.9375rem;
  color: var(--about-text-secondary);
  max-width: 14rem;
  margin: 0 auto;
}

.about-workflow__connector {
  display: none;
}

/* Privacy band */
.about-privacy {
  padding: 6rem 1.5rem;
  background: #1d1d1f;
  color: #f5f5f7;
}

[data-bs-theme="dark"] .about-privacy {
  background: #161617;
}

.about-privacy__inner {
  max-width: 56rem;
  margin: 0 auto;
  text-align: center;
}

.about-privacy__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
}

.about-privacy__sub {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.64);
  margin-bottom: 3.5rem;
}

.about-privacy__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.about-privacy__card {
  padding: 2rem 1.5rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.about-privacy__icon {
  font-size: 1.5rem;
  color: var(--about-accent);
  margin-bottom: 1rem;
}

.about-privacy__card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.about-privacy__card p {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.64);
  margin: 0;
}

/* Footer */
.about-footer {
  padding: 6rem 1.5rem 4rem;
  text-align: center;
}

.about-footer__inner {
  max-width: 36rem;
  margin: 0 auto;
}

.about-footer__title {
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
}

.about-footer__sub {
  color: var(--about-text-secondary);
  margin-bottom: 2rem;
}

.about-footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.about-footer__links {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  font-size: 0.875rem;
}

.about-footer__links a {
  color: var(--about-accent);
  text-decoration: none;
}

.about-footer__links a:hover {
  text-decoration: underline;
}

.about-footer__links span {
  color: var(--about-text-secondary);
}

/* Responsive */
@media (min-width: 768px) {
  .about-br-desktop {
    display: inline;
  }

  .about-feature {
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    padding: 6rem 2rem;
  }

  .about-feature--reverse .about-feature__text {
    order: 2;
  }

  .about-feature--reverse .about-feature__visual {
    order: 1;
  }

  .about-workflow__steps {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: start;
    gap: 0;
  }

  .about-workflow__connector {
    display: block;
    width: 3rem;
    height: 2px;
    background: var(--about-border);
    margin-top: 1.25rem;
    align-self: start;
    justify-self: center;
  }

  .about-privacy__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1068px) {
  .about-showcase {
    padding: 2rem 2rem 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .about-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .about-hero__scroll-hint span::after {
    animation: none;
  }

  .about-cta:hover {
    transform: none;
  }
}
</style>
