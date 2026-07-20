<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppName from "../components/AppName.vue";
import IntroFeatureCard from "../components/intro/IntroFeatureCard.vue";
import ThemePreference from "../components/settings/ThemePreference.vue";
import AiConfigForm from "../components/settings/AiConfigForm.vue";
import { appState } from "../state/appState";
import {
  listPendingSetupSteps,
  listSeenSetupSteps,
  markOnboardingDone,
  markSetupStepSeen
} from "../services/appPrefsStorage";
import { SETUP_GUIDE_STEPS, type SetupGuideStep } from "../services/setupGuide";

type IntroFlow = "" | "setup-all" | "setup" | "product";
type IntroStepKind = "product" | "config" | "finale";

interface IntroStep {
  id: string;
  kind: IntroStepKind;
  label: string;
  title?: string;
  desc?: string;
}

const PRODUCT_STEPS: IntroStep[] = [
  { id: "hero", kind: "product", label: "概览" },
  { id: "step1", kind: "product", label: "Step 1" },
  { id: "step2", kind: "product", label: "Step 2" },
  { id: "banks", kind: "product", label: "题库" },
  { id: "step3", kind: "product", label: "Step 3" }
];

const FINALE_STEP: IntroStep = { id: "start", kind: "finale", label: "开始" };

const route = useRoute();
const router = useRouter();
const stepIndex = ref(0);
const slideDirection = ref<"next" | "prev">("next");
const isExiting = ref(false);
const EXIT_MS = 520;
const githubUrl = `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`;

const flow = computed<IntroFlow>(() => {
  const value = String(route.query.flow || "");
  if (value === "setup-all" || value === "setup" || value === "product") return value;
  return "";
});

const activeConfigSteps = computed<IntroStep[]>(() => {
  if (flow.value === "setup-all") {
    return SETUP_GUIDE_STEPS.map((step: SetupGuideStep) => ({ ...step, kind: "config" as const }));
  }
  if (flow.value === "setup" || flow.value === "") {
    const pending = listPendingSetupSteps();
    if (flow.value === "setup" || pending.length) {
      return pending.map((step: SetupGuideStep) => ({ ...step, kind: "config" as const }));
    }
  }
  return [];
});

const steps = computed<IntroStep[]>(() => {
  if (flow.value === "setup-all" || flow.value === "setup") {
    return [...activeConfigSteps.value, FINALE_STEP];
  }
  if (flow.value === "product") {
    return [...PRODUCT_STEPS, FINALE_STEP];
  }
  // 默认：首次（尚未看过任何配置）→ 产品介绍 + 全部待配；仅有新增待配 → 只走配置页
  const seen = listSeenSetupSteps();
  if (seen.length === 0 && activeConfigSteps.value.length) {
    return [...PRODUCT_STEPS, ...activeConfigSteps.value, FINALE_STEP];
  }
  if (activeConfigSteps.value.length) {
    return [...activeConfigSteps.value, FINALE_STEP];
  }
  return [...PRODUCT_STEPS, FINALE_STEP];
});

const isFirst = computed(() => stepIndex.value === 0);
const isLast = computed(() => stepIndex.value >= steps.value.length - 1);
const currentStep = computed(() => steps.value[stepIndex.value] || FINALE_STEP);
const transitionName = computed(() =>
  slideDirection.value === "next" ? "intro-slide-next" : "intro-slide-prev"
);
const isSetupOnlyFlow = computed(
  () => !steps.value.some((step) => step.kind === "product")
);

watch(
  steps,
  (nextSteps) => {
    if (stepIndex.value >= nextSteps.length) {
      stepIndex.value = Math.max(0, nextSteps.length - 1);
    }
  },
  { immediate: true }
);

watch(
  () => route.fullPath,
  () => {
    stepIndex.value = 0;
    slideDirection.value = "next";
  }
);

function goTo(index: number) {
  if (index < 0 || index >= steps.value.length || index === stepIndex.value) return;
  slideDirection.value = index > stepIndex.value ? "next" : "prev";
  stepIndex.value = index;
}

function markCurrentConfigSeen() {
  const step = currentStep.value;
  if (step?.kind === "config" && step.id) {
    markSetupStepSeen(step.id);
  }
}

function nextStep() {
  markCurrentConfigSeen();
  if (isLast.value) {
    finishOnboarding();
    return;
  }
  goTo(stepIndex.value + 1);
}

function prevStep() {
  goTo(stepIndex.value - 1);
}

function finishOnboarding() {
  if (isExiting.value) return;

  markCurrentConfigSeen();
  if (flow.value === "setup-all") {
    markOnboardingDone();
  } else if (!listPendingSetupSteps().length) {
    markOnboardingDone();
  }

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (reduceMotion) {
    router.push("/home");
    return;
  }

  isExiting.value = true;
  window.setTimeout(() => {
    router.push("/home");
  }, EXIT_MS);
}

function handleKeydown(event: KeyboardEvent) {
  if (isExiting.value) return;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    nextStep();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    prevStep();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="intro-page" :class="{ 'is-exiting': isExiting }">
    <header class="intro-topbar">
      <div class="intro-container intro-topbar__inner">
        <button type="button" class="intro-topbar__brand" :disabled="isExiting" @click="goTo(0)">
          <AppName />
        </button>
        <button
          type="button"
          class="intro-topbar__link intro-topbar__link-btn"
          :disabled="isExiting"
          @click="finishOnboarding"
        >          {{ isSetupOnlyFlow ? "稍后再说" : "前往首页" }}
          <i class="fas fa-arrow-right ms-1"></i>
        </button>
      </div>
    </header>

    <div class="intro-stage" aria-live="polite">
      <Transition :name="transitionName" mode="out-in">
        <section
          :key="currentStep.id"
          class="intro-panel"
          :class="[
            `intro-panel--${currentStep.id}`,
            currentStep.kind === 'config' ? 'intro-panel--config' : '',
            currentStep.kind === 'finale' ? 'intro-panel--start' : ''
          ]"
        >
          <div class="intro-container intro-panel__inner">
            <template v-if="currentStep.id === 'hero'">
              <div class="intro-hero-glow" aria-hidden="true"></div>
              <h1 class="intro-hero-title">
                What is <AppName /> ?
              </h1>
              <p class="intro-hero-subtitle">
                _txt_ 是一个帮助人们进行知识巩固的学习工具。
              </p>
              <ul class="intro-hero-list">
                <li>把笔记整理成题集</li>
                <li>本地题库管理与远程下载</li>
                <li>做题练习、记录进度、随时复盘</li>
              </ul>
            </template>

            <template v-else-if="currentStep.id === 'step1'">
              <p class="intro-section-label">Step 1</p>
              <h2 class="intro-section-title">题集录入</h2>
              <p class="intro-section-desc">手动整理笔记，或用 AI 对话快速出题，两种方式随时切换。</p>
              <div class="intro-feature-grid">
                <IntroFeatureCard icon="fas fa-keyboard" title="手动录入" desc="逐题填写 txt、配图与解析说明" />
                <IntroFeatureCard icon="fas fa-robot" title="AI 生成" desc="配置模型后，用自然语言描述即可出题" />
                <IntroFeatureCard icon="fas fa-image" title="题目配图" desc="支持为每道题附加示意图" />
                <IntroFeatureCard icon="fas fa-lightbulb" title="解析字段" desc="为每题补充讲解，方便复盘巩固" />
              </div>
            </template>

            <template v-else-if="currentStep.id === 'step2'">
              <p class="intro-section-label">Step 2</p>
              <h2 class="intro-section-title">JSON 与题库</h2>
              <p class="intro-section-desc">一键生成标准题集 JSON，导入导出备份，或保存到浏览器本地题库。</p>
              <div class="intro-feature-grid">
                <IntroFeatureCard icon="fas fa-bolt" title="一键生成" desc="Step 1 录入完成后，一键转为标准 JSON" />
                <IntroFeatureCard icon="fas fa-file-import" title="导入合并" desc="加载本地 JSON，或合并多个题集文件" />
                <IntroFeatureCard icon="fas fa-save" title="保存与导出" desc="写入浏览器题库，或导出 .json 文件备份" />
                <IntroFeatureCard icon="fas fa-book" title="题库联动" desc="保存后进入题库页，继续管理与开练" />
              </div>
            </template>

            <template v-else-if="currentStep.id === 'banks'">
              <p class="intro-section-label">题库与进度</p>
              <h2 class="intro-section-title">集中管理，随时续练</h2>
              <p class="intro-section-desc">本地题库与内置远程题库统一管理，未完成练习自动记录进度。</p>
              <div class="intro-feature-grid">
                <IntroFeatureCard icon="fas fa-folder-open" title="本地题库" desc="编辑、搜索、删除本地题集；新题集在首页录入后入库" variant="dark" />
                <IntroFeatureCard icon="fas fa-cloud-download-alt" title="远程题库" desc="从内置网络题库下载到本地继续练" variant="dark" />
                <IntroFeatureCard icon="fas fa-history" title="题集进度" desc="查看未完成记录，一键回到上次位置" variant="dark" />
                <IntroFeatureCard icon="fas fa-search" title="快速检索" desc="按名称、科目、作者筛选题集" variant="dark" />
              </div>
            </template>

            <template v-else-if="currentStep.id === 'step3'">
              <p class="intro-section-label">Step 3</p>
              <h2 class="intro-section-title">练习巩固</h2>
              <p class="intro-section-desc">在首页或独立练习页答题，结果实时记录，纯前端运行、数据保存在本地。</p>
              <div class="intro-feature-grid">
                <IntroFeatureCard icon="fas fa-pen" title="多种题型" desc="单选、多选、判断、填空等自动识别" />
                <IntroFeatureCard icon="fas fa-check-circle" title="即时判题" desc="提交后立刻看到对错与解析" />
                <IntroFeatureCard icon="fas fa-comments" title="AI 答疑" desc="练习时可就当前题目向 AI 提问" />
                <IntroFeatureCard icon="fas fa-database" title="本地同步" desc="进度写入 localStorage，刷新不丢失" />
              </div>
            </template>

            <template v-else-if="currentStep.id === 'theme'">
              <p class="intro-section-label">配置 · {{ currentStep.label }}</p>
              <h2 class="intro-section-title">{{ currentStep.title }}</h2>
              <p class="intro-section-desc">{{ currentStep.desc }}</p>
              <div class="intro-setup-card">
                <ThemePreference variant="intro" />
              </div>
            </template>

            <template v-else-if="currentStep.id === 'ai'">
              <p class="intro-section-label">配置 · {{ currentStep.label }}</p>
              <h2 class="intro-section-title">{{ currentStep.title }}</h2>
              <p class="intro-section-desc">{{ currentStep.desc }}</p>
              <div class="intro-setup-card intro-setup-card--ai">
                <AiConfigForm id-prefix="intro-ai" />
              </div>
            </template>

            <template v-else>
              <h2 class="intro-section-title intro-start-title">
                {{ isSetupOnlyFlow ? "配置完成" : "准备好了？" }}
              </h2>
              <p class="intro-section-desc intro-start-desc">
                {{
                  isSetupOnlyFlow
                    ? "这些设置之后仍可在「设置」中修改，也可以随时重新走一遍完整引导。"
                    : "配置可随时在设置里修改。现在开始整理题集、练习巩固吧。"
                }}
              </p>
              <div class="intro-footer-actions">
                <button
                  type="button"
                  class="intro-btn intro-btn--primary"
                  :disabled="isExiting"
                  @click="finishOnboarding"
                >
                  <i class="fas fa-play me-1"></i>开始使用
                </button>
                <a
                  v-if="!isSetupOnlyFlow"
                  class="intro-btn intro-btn--outline"
                  :href="githubUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i class="fab fa-github me-1"></i>GitHub Star
                </a>
              </div>
              <p v-if="!isSetupOnlyFlow" class="intro-footer-note">
                开源学习工具 · {{ appState.webSiteConfig.appAuthor.name }}
              </p>
            </template>
          </div>
        </section>
      </Transition>
    </div>

    <footer class="intro-controls">
      <div class="intro-container intro-controls__inner">
        <button
          type="button"
          class="intro-controls__nav"
          :disabled="isFirst || isExiting"
          aria-label="上一步"
          @click="prevStep"
        >
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
          上一步
        </button>

        <div class="intro-dots" role="tablist" aria-label="介绍步骤">
          <button
            v-for="(step, index) in steps"
            :key="`${step.id}-${index}`"
            type="button"
            class="intro-dots__item"
            :class="{ 'is-active': index === stepIndex }"
            role="tab"
            :aria-selected="index === stepIndex"
            :aria-label="step.label"
            :disabled="isExiting"
            @click="goTo(index)"
          />
        </div>

        <button
          type="button"
          class="intro-controls__nav intro-controls__nav--primary"
          :disabled="isExiting"
          @click="nextStep"
        >
          {{ isLast ? "开始使用" : "下一步" }}
          <i class="fas" :class="isLast ? 'fa-play' : 'fa-arrow-right'" aria-hidden="true"></i>
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.intro-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100dvh;
  color: #0f172a;
  background: #0a0a0a;
  overflow: hidden;
}

.intro-page.is-exiting {
  pointer-events: none;
}

.intro-page.is-exiting .intro-topbar {
  transform: translateY(-110%);
  opacity: 0;
}

.intro-page.is-exiting .intro-stage {
  opacity: 0;
}

.intro-page.is-exiting .intro-controls {
  transform: translateY(110%);
  opacity: 0;
}

.intro-container {
  width: min(72rem, 100%);
  margin: 0 auto;
  padding-inline: clamp(1rem, 3vw, 2rem);
}

.intro-topbar {
  flex: 0 0 auto;
  z-index: 2;
  background: rgba(10, 10, 10, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
  will-change: transform, opacity;
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
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.intro-topbar__link:hover,
.intro-topbar__brand:hover {
  color: #93c5fd;
}

.intro-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.5s ease;
  will-change: opacity;
}

.intro-panel {
  position: absolute;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.intro-panel__inner {
  position: relative;
  min-height: 100%;
  padding-block: clamp(1.5rem, 4vw, 2.75rem);
  padding-bottom: 1.5rem;
}

.intro-panel--hero {
  background: #0a0a0a;
  color: #f8fafc;
  text-align: center;
}

.intro-panel--hero .intro-panel__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.intro-panel--step1 {
  background: #d8e8f8;
}

.intro-panel--step2 {
  background: #e8ddd0;
}

.intro-panel--banks {
  background: #4a82e8;
  color: #f8fafc;
}

.intro-panel--step3 {
  background: #e8ecf0;
}

.intro-panel--config {
  background: #111827;
  color: #f8fafc;
}

.intro-panel--start {
  background: linear-gradient(180deg, #d1e3f0 0%, #eef4f9 100%);
  text-align: center;
}

.intro-panel--start .intro-panel__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.intro-hero-glow {
  position: absolute;
  top: 18%;
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
  font-size: clamp(1.65rem, 4.2vw + 0.55rem, 2.75rem);
  font-weight: 800;
  line-height: 1.2;
}

.intro-hero-subtitle {
  position: relative;
  margin: 0 auto 1.25rem;
  max-width: min(34rem, 100%);
  font-size: clamp(0.95rem, 1.5vw + 0.75rem, 1.15rem);
  line-height: 1.55;
  color: #cbd5e1;
}

.intro-hero-list {
  position: relative;
  margin: 0 auto;
  padding: 0;
  list-style: none;
  width: 100%;
  max-width: 52rem;
  color: #e2e8f0;
  font-size: clamp(0.85rem, 1vw + 0.75rem, 1rem);
  line-height: 1.7;
}

.intro-section-label {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.72;
}

.intro-panel--banks .intro-section-label,
.intro-panel--banks .intro-section-desc,
.intro-panel--config .intro-section-label,
.intro-panel--config .intro-section-desc {
  color: rgba(248, 250, 252, 0.88);
}

.intro-section-title {
  margin: 0 0 0.6rem;
  font-size: clamp(1.35rem, 2vw + 1rem, 2rem);
  font-weight: 800;
  line-height: 1.25;
}

.intro-panel--banks .intro-section-title,
.intro-panel--config .intro-section-title {
  color: #fff;
}

.intro-section-desc {
  margin: 0 0 1.25rem;
  font-size: clamp(0.88rem, 1vw + 0.75rem, 1.05rem);
  line-height: 1.55;
  color: #334155;
  max-width: 42rem;
}

.intro-start-title {
  text-align: center;
}

.intro-start-desc {
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.intro-feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(0.75rem, 2vw, 1rem);
}

.intro-setup-card {
  margin-top: 0.25rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  max-width: 42rem;
}

.intro-setup-card :deep(.form-label),
.intro-setup-card :deep(.form-check-label),
.intro-setup-card :deep(.ai-config-form__balance) {
  color: #cbd5e1;
}

.intro-setup-card :deep(.form-control),
.intro-setup-card :deep(.form-select) {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(255, 255, 255, 0.18);
  color: #f8fafc;
}

.intro-setup-card :deep(.form-control::placeholder) {
  color: #64748b;
}

.intro-setup-card :deep(.btn-outline-secondary) {
  border-color: rgba(255, 255, 255, 0.28);
  color: #e2e8f0;
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
  border: none;
  cursor: pointer;
}

.intro-btn--primary {
  background: #2563eb;
  color: #fff;
}

.intro-btn--outline {
  border: 1px solid #94a3b8;
  color: #1e293b;
  background: rgba(255, 255, 255, 0.7);
}

.intro-footer-note {
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
}

.intro-controls {
  flex: 0 0 auto;
  z-index: 2;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 10, 0.94);
  transition: transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
  will-change: transform, opacity;
}

.intro-controls__inner {
  display: grid;
  grid-template-columns: minmax(5.5rem, 1fr) auto minmax(5.5rem, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding-block: 0.85rem;
}

.intro-controls__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: transparent;
  color: #e2e8f0;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.intro-controls__nav:first-child {
  justify-self: start;
}

.intro-controls__nav--primary {
  justify-self: end;
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.intro-controls__nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.intro-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.intro-dots__item {
  width: 0.5rem;
  height: 0.5rem;
  border: none;
  border-radius: 999px;
  padding: 0;
  background: rgba(248, 250, 252, 0.28);
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}

.intro-dots__item.is-active {
  width: 1.35rem;
  background: #60a5fa;
}

.intro-slide-next-enter-active,
.intro-slide-next-leave-active,
.intro-slide-prev-enter-active,
.intro-slide-prev-leave-active {
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}

.intro-slide-next-enter-from {
  transform: translateX(18%);
  opacity: 0;
}

.intro-slide-next-leave-to {
  transform: translateX(-18%);
  opacity: 0;
}

.intro-slide-prev-enter-from {
  transform: translateX(-18%);
  opacity: 0;
}

.intro-slide-prev-leave-to {
  transform: translateX(18%);
  opacity: 0;
}

@media (min-width: 36rem) {
  .intro-hero-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem 1rem;
    text-align: center;
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

@media (prefers-reduced-motion: reduce) {
  .intro-topbar,
  .intro-stage,
  .intro-controls {
    transition: none;
  }

  .intro-page.is-exiting .intro-topbar,
  .intro-page.is-exiting .intro-controls {
    transform: none;
  }

  .intro-slide-next-enter-active,
  .intro-slide-next-leave-active,
  .intro-slide-prev-enter-active,
  .intro-slide-prev-leave-active {
    transition: none;
  }

  .intro-slide-next-enter-from,
  .intro-slide-next-leave-to,
  .intro-slide-prev-enter-from,
  .intro-slide-prev-leave-to {
    transform: none;
    opacity: 1;
  }
}
</style>
