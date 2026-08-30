<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { HomeLandingSection } from "./homeLandingContent";

defineProps<{
  section: HomeLandingSection;
}>();
</script>

<template>
  <section
    class="home-landing__section"
    :class="`home-landing__section--${section.tone}`"
    :aria-labelledby="`home-section-${section.id}`"
  >
    <div class="home-landing__container">
      <header class="home-landing__section-header">
        <p class="home-landing__section-label">{{ section.label }}</p>
        <h2 :id="`home-section-${section.id}`" class="home-landing__section-title">
          {{ section.title }}
        </h2>
        <p class="home-landing__section-desc">{{ section.desc }}</p>
      </header>

      <ul class="home-landing__feature-grid">
        <li v-for="feature in section.features" :key="feature.title" class="home-landing__feature">
          <div class="home-landing__feature-icon" aria-hidden="true">
            <i :class="feature.icon"></i>
          </div>
          <h3 class="home-landing__feature-title">{{ feature.title }}</h3>
          <p class="home-landing__feature-desc">{{ feature.desc }}</p>
        </li>
      </ul>

      <div v-if="section.ctas?.length" class="home-landing__section-ctas">
        <RouterLink
          v-for="cta in section.ctas"
          :key="`${section.id}-${cta.to}-${cta.label}`"
          :to="cta.to"
          class="home-landing__btn"
          :class="cta.primary ? 'home-landing__btn--primary' : 'home-landing__btn--ghost'"
        >
          {{ cta.label }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
