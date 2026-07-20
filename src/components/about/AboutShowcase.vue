<script setup lang="ts">
const homeScreenshot = `${import.meta.env.BASE_URL}images/home.png`;
</script>

<template>
  <section class="about-showcase-band about-reveal">
    <div class="about-showcase-band__inner">
      <div class="about-showcase__frame">
        <img
          :src="homeScreenshot"
          alt="_txt_ 首页界面预览"
          class="about-showcase__img"
          loading="lazy"
        />
      </div>
      <p class="about-showcase__caption">从编辑到预览，一页完成。</p>
    </div>
  </section>
</template>
