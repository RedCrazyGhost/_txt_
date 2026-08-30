<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppName from "../AppName.vue";
import { HOME_HERO } from "./homeLandingContent";
</script>

<template>
  <section class="home-landing__hero" aria-labelledby="home-landing-brand">
    <div class="home-landing__container home-landing__hero-inner">
      <h1 id="home-landing-brand" class="home-landing__brand">
        <AppName />
      </h1>
      <p class="home-landing__headline">{{ HOME_HERO.headline }}</p>
      <p class="home-landing__subtitle">{{ HOME_HERO.subtitle }}</p>
      <ul class="home-landing__bullets">
        <li v-for="bullet in HOME_HERO.bullets" :key="bullet">{{ bullet }}</li>
      </ul>
      <div class="home-landing__ctas">
        <RouterLink
          v-for="cta in HOME_HERO.ctas"
          :key="cta.to"
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
