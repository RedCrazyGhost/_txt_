<script setup lang="ts">
const privacyPoints = [
  { title: "纯前端", desc: "无需安装，打开浏览器即可使用" },
  { title: "本地存储", desc: "数据保存在你的设备，不上传服务器" },
  { title: "即时同步", desc: "修改立即反映，同一浏览器内无缝衔接" }
];
</script>

<template>
  <section class="about-privacy">
    <div class="about-privacy__inner about-reveal">
      <p class="about-eyebrow about-eyebrow--light">数据与隐私</p>
      <h2 class="about-privacy__title">数据留在本地。</h2>
      <p class="about-privacy__sub">
        无账号体系，不自动上传。你的题集与练习进度，只属于你。
      </p>
      <div class="about-privacy__grid">
        <div v-for="point in privacyPoints" :key="point.title" class="about-privacy__card">
          <h3>{{ point.title }}</h3>
          <p>{{ point.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
