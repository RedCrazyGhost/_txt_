<script setup lang="ts">
import { onMounted } from "vue";
import HomeHero from "../components/home-landing/HomeHero.vue";
import HomeFeatureSection from "../components/home-landing/HomeFeatureSection.vue";
import HomeFinale from "../components/home-landing/HomeFinale.vue";
import { HOME_SECTIONS } from "../components/home-landing/homeLandingContent";
import { markOnboardingDone } from "../services/appPrefsStorage";
import "../assets/home-landing.css";

onMounted(() => {
  markOnboardingDone();
});
</script>

<template>
  <div class="home-landing">
    <HomeHero />
    <HomeFeatureSection
      v-for="section in HOME_SECTIONS"
      :key="section.id"
      :section="section"
    />
    <HomeFinale />
  </div>
</template>
