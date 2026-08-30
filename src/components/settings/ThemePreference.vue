<script setup lang="ts">
import { computed } from "vue";
import { appState } from "../../state/appState";
import { setTheme, type AppTheme } from "../../services/appPrefsStorage";

const currentTheme = computed(() =>
  appState.webSiteConfig.appColor === "dark" ? "dark" : "light"
);

function selectTheme(theme: AppTheme) {
  const prefs = setTheme(theme);
  appState.webSiteConfig.appColor = prefs.theme;
}
</script>

<template>
  <div class="theme-preference">
    <p class="form-label mb-2">界面主题</p>
    <div class="theme-preference__options" role="group" aria-label="界面主题">
      <button
        type="button"
        class="theme-preference__btn"
        :class="{ 'is-active': currentTheme === 'light' }"
        :aria-pressed="currentTheme === 'light'"
        @click="selectTheme('light')"
      >
        <i class="fas fa-sun me-1" aria-hidden="true"></i>
        浅色
      </button>
      <button
        type="button"
        class="theme-preference__btn"
        :class="{ 'is-active': currentTheme === 'dark' }"
        :aria-pressed="currentTheme === 'dark'"
        @click="selectTheme('dark')"
      >
        <i class="fas fa-moon me-1" aria-hidden="true"></i>
        深色
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-preference__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.theme-preference__btn {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  font-size: 0.875rem;
  cursor: pointer;
}

.theme-preference__btn.is-active {
  border-color: var(--bs-primary);
  color: var(--bs-primary);
  background: color-mix(in srgb, var(--bs-primary) 12%, transparent);
}
</style>
