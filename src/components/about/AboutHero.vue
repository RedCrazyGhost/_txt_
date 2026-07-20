<template>
  <section class="about-hero-band about-reveal">
    <p class="about-hero-band__eyebrow">应用介绍</p>
    <h1 class="about-hero-band__title">
      <AppName />
    </h1>
    <p class="about-hero-band__headline">知识巩固，从此简单。</p>
    <p class="about-hero-band__sub">
      将知识点整理为题集，通过反复练习真正掌握。在浏览器中完成编辑、管理与练习。
    </p>
    <div class="about-hero-band__actions">
      <router-link class="btn btn-primary btn-lg" to="/home">
        开始制作
      </router-link>
      <router-link class="btn btn-outline-secondary btn-lg" to="/question-bank">
        浏览题库
      </router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppName from "../AppName.vue";
</script>
