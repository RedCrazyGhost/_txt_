<script setup>
import { judgeAnswerTrue } from "../utils/questions";

const props = defineProps({
  data: { type: Object, required: true },
  appcolor: { type: String, default: "light" }
});

function judgeColorChangeFontColor(color) {
  return color === "light" ? "dark" : "light";
}

function judgeAnswerTrueIClass(question) {
  let trueNumber = 0;
  for (let i = 0; i < question.answers.length; i += 1) {
    if (judgeAnswerTrue(question, i)) trueNumber += 1;
  }
  return trueNumber === question.results.length
    ? "fas fa-check fa-3x text-success"
    : "fas fa-exclamation fa-3x text-danger";
}

function resultColor(question, index) {
  return judgeAnswerTrue(question, index) ? "var(--bs-green)" : "var(--bs-red)";
}

function answerShow(question) {
  const oldValue = new Array(question.results.length);
  question.results = question.answers;
  setTimeout(() => {
    question.results = oldValue;
  }, 5000);
}
</script>

<template>
  <div>
    <div
      class="card h-100 shadow-sm bg-body rounded"
      v-for="(question, qindex) in data.questions"
      :key="`question-${qindex}`"
      style="margin-bottom: 3rem"
    >
      <div class="card-header">题目 {{ qindex + 1 }}</div>
      <img v-if="question.image !== ''" :src="question.image" class="card-img-top" :alt="`question-image-${qindex}`" />
      <i :class="`position-absolute top-0 start-100 translate-middle ${judgeAnswerTrueIClass(question)}`"></i>
      <div class="card-body" id="question">
        <span
          data-title="Step3"
          data-intro="点击可显示5秒答案"
          @click="answerShow(question)"
          class="fa-stack fa-lg position-absolute top-100 start-100 translate-middle"
          v-if="!question.MD5"
        >
          <i :class="`fa fa-camera fa-stack-1x text-${judgeColorChangeFontColor(appcolor)}`"></i>
          <i class="fa fa-ban fa-stack-2x text-danger"></i>
        </span>
        <p>
          <span style="white-space: pre-line" class="card-text" v-for="(text, tindex) in question.texts" :key="`text-${qindex}-${tindex}`">
            <input
              v-if="tindex % 2 === 1"
              type="text"
              v-model="question.results[(tindex - 1) / 2]"
              :style="`padding-right:1px;padding-left:2px;overflow:hidden;border-left-width:0;border-top-width:0;border-right-width:0;width:${question.answerslength[(tindex - 1) / 2]}px;color:${resultColor(question,(tindex - 1) / 2)};`"
            />
            <span v-else>{{ text }}</span>
          </span>
        </p>
      </div>
      <div class="card-footer">
        <small class="text-muted" data-bs-spy="scroll" data-bs-target="#question" data-bs-offset="0" tabindex="0">
          <a
            :href="`#question-${qindex}-${rindex}`"
            v-for="(_, rindex) in question.results"
            :key="`result-${rindex}`"
            :style="`color:${resultColor(question, rindex)};text-decoration:none;margin-right:8px;`"
          >
            第{{ rindex + 1 }}个：{{ judgeAnswerTrue(question, rindex) ? "正确" : "错误" }}
          </a>
        </small>
      </div>
    </div>
  </div>
</template>
