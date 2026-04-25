<script setup>
import { computed } from "vue";
import { appState } from "../state/appState";
import AppQuestion from "../components/AppQuestion.vue";
import { allAnswerNumber, numberToPercent, trueAnswerNumber } from "../utils/questions";

const hasQuestions = computed(() => Array.isArray(appState.questionsJSON.questions) && appState.questionsJSON.questions.length > 0);
</script>

<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <h2 class="mb-0">{{ appState.questionsJSON.name || "未命名题集" }}</h2>
       <div class="text-muted small">
          <span class="me-3">类型：{{ appState.questionsJSON.type || "-" }}</span>
          <span>作者：{{ appState.questionsJSON.author || "-" }}</span>
        </div>
      </div>
      <router-link class="btn btn-outline-secondary" to="/question-bank">
        <i class="fas fa-arrow-left me-1"></i>返回题库
      </router-link>
    </div>

    <div v-if="!hasQuestions" class="card shadow-sm">
      <div class="card-body">
        <p class="mb-3">当前没有可做题目，请先在题库页选择题集并点击“开始做题”。</p>
        <router-link class="btn btn-primary btn-sm" to="/question-bank">
          <i class="fas fa-book me-1"></i>前往题库
        </router-link>
      </div>
    </div>

    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span>答题进度</span>
        <span>{{ trueAnswerNumber(appState.questionsJSON.questions) }}/{{ allAnswerNumber(appState.questionsJSON.questions) }}</span>
      </div>
      <div class="progress mb-4">
        <div
          class="progress-bar bg-success progress-bar-striped progress-bar-animated"
          role="progressbar"
          :style="`width:${numberToPercent(trueAnswerNumber(appState.questionsJSON.questions), allAnswerNumber(appState.questionsJSON.questions))}%`"
        ></div>
        <div
          class="progress-bar bg-danger"
          role="progressbar"
          :style="`width:${numberToPercent(allAnswerNumber(appState.questionsJSON.questions) - trueAnswerNumber(appState.questionsJSON.questions), allAnswerNumber(appState.questionsJSON.questions))}%`"
        ></div>
      </div>
      <AppQuestion :data="appState.questionsJSON" :appcolor="appState.webSiteConfig.appColor" />
    </div>
  </div>
</template>
