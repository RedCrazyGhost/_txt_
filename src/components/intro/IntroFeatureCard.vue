<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  variant: { type: String, default: "light" }
});
</script>

<template>
  <article class="intro-feature-card" :class="`intro-feature-card--${variant}`">
    <div class="intro-feature-card__icon" aria-hidden="true">
      <i :class="icon"></i>
    </div>
    <h3 class="intro-feature-card__title">{{ title }}</h3>
    <p v-if="desc" class="intro-feature-card__desc">{{ desc }}</p>
  </article>
</template>

<style scoped>
.intro-feature-card {
  border-radius: clamp(16px, 2vw, 20px);
  padding: clamp(0.85rem, 2vw, 1.15rem);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  min-height: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.intro-feature-card--light {
  background: rgba(255, 255, 255, 0.92);
  color: #1e293b;
}

.intro-feature-card--dark {
  background: rgba(15, 23, 42, 0.55);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.intro-feature-card__icon {
  font-size: 1.35rem;
  line-height: 1;
  opacity: 0.9;
}

.intro-feature-card__title {
  margin: 0;
  font-size: clamp(0.88rem, 1vw + 0.7rem, 1.05rem);
  font-weight: 700;
  line-height: 1.35;
}

.intro-feature-card__desc {
  margin: 0;
  font-size: clamp(0.72rem, 0.8vw + 0.65rem, 0.85rem);
  line-height: 1.45;
  opacity: 0.82;
}
</style>
