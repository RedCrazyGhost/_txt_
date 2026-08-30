<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import AppName from "../AppName.vue";
import { appState } from "../../state/appState";
import { HOME_FINALE } from "./homeLandingContent";

const githubUrl = computed(
  () =>
    `https://github.com/${appState.webSiteConfig.githubRepo.owner}/${appState.webSiteConfig.githubRepo.repo}`
);

const authorName = computed(() => appState.webSiteConfig.appAuthor.name);
</script>

<template>
  <section class="home-landing__finale" aria-labelledby="home-finale-title">
    <div class="home-landing__container home-landing__finale-inner">
      <h2 id="home-finale-title" class="home-landing__finale-title">{{ HOME_FINALE.title }}</h2>
      <p class="home-landing__finale-desc">{{ HOME_FINALE.desc }}</p>
      <div class="home-landing__ctas">
        <RouterLink
          :to="HOME_FINALE.primaryCta.to"
          class="home-landing__btn home-landing__btn--primary"
        >
          {{ HOME_FINALE.primaryCta.label }}
        </RouterLink>
      </div>
      <div class="home-landing__finale-links">
        <a
          class="home-landing__text-link"
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <RouterLink class="home-landing__text-link" :to="HOME_FINALE.aboutTo">关于</RouterLink>
      </div>
      <p class="home-landing__finale-note">
        开源学习工具 · <AppName /> · {{ authorName }}
      </p>
    </div>
  </section>
</template>
