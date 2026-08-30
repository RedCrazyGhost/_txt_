<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { appState } from "../state/appState";
import AiConfigForm from "../components/settings/AiConfigForm.vue";
import ThemePreference from "../components/settings/ThemePreference.vue";
import StorageUsagePanel from "../components/StorageUsagePanel.vue";

type SettingsSectionId = "appearance" | "ai" | "storage" | "about";

const SECTIONS: Array<{ id: SettingsSectionId; label: string; icon: string }> = [
  { id: "appearance", label: "外观", icon: "fas fa-palette" },
  { id: "ai", label: "AI", icon: "fas fa-robot" },
  { id: "storage", label: "数据与存储", icon: "fas fa-database" },
  { id: "about", label: "关于", icon: "fas fa-info-circle" }
];

const route = useRoute();
const router = useRouter();

const sectionIds = new Set<SettingsSectionId>(SECTIONS.map((item) => item.id));

const activeSection = ref<SettingsSectionId>(
  sectionIds.has(String(route.query.section || "") as SettingsSectionId)
    ? (String(route.query.section) as SettingsSectionId)
    : "appearance"
);

const githubUrl = computed(
  () =>
    `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`
);

function selectSection(id: SettingsSectionId) {
  if (!sectionIds.has(id) || activeSection.value === id) return;
  activeSection.value = id;
  router.replace({ query: { ...route.query, section: id } });
}

watch(
  () => route.query.section,
  (section) => {
    const next = String(section || "") as SettingsSectionId;
    if (sectionIds.has(next) && next !== activeSection.value) {
      activeSection.value = next;
    }
  }
);
</script>

<template>
  <div class="container py-4 settings-page">
    <header class="mb-4">
      <h2 class="mb-1">设置</h2>
      <p class="text-muted mb-0">统一管理外观、AI 模型与本地数据相关配置。配置仅保存在本机。</p>
    </header>

    <div class="settings-layout">
      <aside class="settings-sidebar" aria-label="设置分类">
        <nav class="settings-nav">
          <button
            v-for="item in SECTIONS"
            :key="item.id"
            type="button"
            class="settings-nav__item"
            :class="{ 'is-active': activeSection === item.id }"
            :aria-current="activeSection === item.id ? 'page' : undefined"
            @click="selectSection(item.id)"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <div class="settings-main">
        <section v-show="activeSection === 'appearance'" class="card shadow-sm settings-panel">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fas fa-palette" aria-hidden="true"></i>
            外观
          </div>
          <div class="card-body">
            <ThemePreference />
            <p class="small text-muted mb-0 mt-2">主题偏好会保存在本机，刷新后仍然生效。</p>
          </div>
        </section>

        <section v-show="activeSection === 'ai'" class="card shadow-sm settings-panel">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fas fa-robot" aria-hidden="true"></i>
            AI
          </div>
          <div class="card-body">
            <p class="small text-muted mb-3">配置仅保存在本机，不会上传到服务器。</p>
            <AiConfigForm id-prefix="settings-ai" />
          </div>
        </section>

        <section v-show="activeSection === 'storage'" class="card shadow-sm settings-panel">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fas fa-database" aria-hidden="true"></i>
            数据与存储
          </div>
          <div class="card-body">
            <StorageUsagePanel compact />
          </div>
        </section>

        <section v-show="activeSection === 'about'" class="card shadow-sm settings-panel">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            关于
          </div>
          <div class="card-body settings-about">
            <p class="mb-1">
              当前版本：<strong>v{{ appState.webSiteConfig.appVersion }}</strong>
            </p>
            <p class="mb-2">
              _txt_ 由 <strong>{{ appState.webSiteConfig.appAuthor.name }}</strong> 发起并持续维护，
              帮助学习者整理知识与练习巩固。
            </p>
            <p class="text-muted small mb-3">
              感谢每一位使用者、贡献者与赞助者，以及所有反馈建议，让项目持续改进。
            </p>

            <h3 class="settings-about__subtitle h6">开源依赖</h3>
            <ul class="settings-about__list small mb-4">
              <li>Vue 3 + Vite / vite-ssg</li>
              <li>Bootstrap 5</li>
              <li>Font Awesome</li>
              <li>Axios</li>
              <li>FileSaver</li>
            </ul>

            <h3 class="settings-about__subtitle h6">参与与支持</h3>
            <ul class="settings-about__list small mb-3">
              <li>使用中提交问题与建议</li>
              <li>通过 GitHub Issue / PR 参与改进</li>
              <li>分享给有学习巩固需求的朋友</li>
              <li>
                喜欢的话欢迎在
                <a
                  class="settings-about__github"
                  :href="githubUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i class="fab fa-github me-1" aria-hidden="true"></i>GitHub
                </a>
                给项目一个
                <i class="fas fa-star text-warning" aria-hidden="true"></i>
              </li>
            </ul>

            <p class="small text-muted mb-2">赞助名单</p>
            <div class="row row-cols-2 row-cols-md-3 g-2">
              <div
                class="col"
                v-for="person in appState.webSiteConfig.appCoinPerson"
                :key="person.name"
              >
                <div class="border rounded px-2 py-1 h-100 d-flex align-items-center gap-2">
                  <img
                    v-if="person.src"
                    :src="person.src"
                    alt="赞助者头像"
                    class="rounded-circle settings-about__avatar"
                  />
                  <i v-else :class="`fas fa-lg fa-${person.iclass || 'smile'}`"></i>
                  <span class="small">{{ person.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-layout {
  display: grid;
  gap: 1rem;
}

.settings-sidebar {
  min-width: 0;
}

.settings-nav {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  -webkit-overflow-scrolling: touch;
}

.settings-nav__item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  padding: 0.55rem 0.85rem;
  font-size: 0.9rem;
  white-space: nowrap;
  cursor: pointer;
}

.settings-nav__item:hover {
  border-color: color-mix(in srgb, var(--bs-primary) 45%, var(--bs-border-color));
  color: var(--bs-primary);
}

.settings-nav__item.is-active {
  border-color: var(--bs-primary);
  background: color-mix(in srgb, var(--bs-primary) 12%, transparent);
  color: var(--bs-primary);
  font-weight: 600;
}

.settings-nav__item i {
  width: 1rem;
  text-align: center;
  opacity: 0.9;
}

.settings-main {
  min-width: 0;
}

.settings-panel {
  min-height: 12rem;
}

.settings-about__subtitle {
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.settings-about__list {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--bs-secondary-color);
}

.settings-about__list li + li {
  margin-top: 0.25rem;
}

.settings-about__github {
  color: var(--bs-link-color);
  text-decoration: none;
  font-weight: 500;
}

.settings-about__github:hover {
  color: var(--bs-link-hover-color);
  text-decoration: underline;
}

.settings-about__github i {
  color: inherit;
}

.settings-about__avatar {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: cover;
}

@media (min-width: 768px) {
  .settings-layout {
    grid-template-columns: 13.5rem minmax(0, 1fr);
    align-items: start;
    gap: 1.25rem;
  }

  .settings-sidebar {
    position: sticky;
    top: 1rem;
  }

  .settings-nav {
    flex-direction: column;
    overflow: visible;
    padding-bottom: 0;
  }

  .settings-nav__item {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
