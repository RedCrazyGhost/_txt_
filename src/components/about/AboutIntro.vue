<template>
  <header class="mb-4 about-reveal">
    <h2 class="mb-1">应用介绍</h2>
    <p class="about-intro__brand mb-2">
      <AppName /> 是一个帮助人们进行知识巩固的网站
    </p>
    <p class="about-intro__slogan mb-3">
      将知识点整理为题集，通过反复练习真正掌握。在浏览器中完成编辑、管理与练习，无需额外软件。
    </p>
    <div class="d-flex flex-wrap gap-2">
      <router-link class="btn btn-primary" to="/home">
        <i class="fas fa-pen me-1"></i>开始制作
      </router-link>
      <router-link class="btn btn-outline-secondary" to="/question-bank">
        <i class="fas fa-book me-1"></i>浏览题库
      </router-link>
    </div>
  </header>
</template>

<script setup lang="ts">
import AppName from "../AppName.vue";
</script>
