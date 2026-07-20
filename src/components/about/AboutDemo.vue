<script setup lang="ts">
const homeScreenshot = `${import.meta.env.BASE_URL}images/home.png`;

const examples = [
  {
    label: "填空题",
    syntax: "1+1=_2_"
  },
  {
    label: "单选题",
    syntax: "Vue 是 _[A]前端框架 [B]数据库 [C]操作系统_"
  },
  {
    label: "多段填空",
    syntax: "水的化学式是_H2O_，沸点是_100_℃"
  }
];
</script>

<template>
  <section class="mb-4 about-reveal">
    <h3 class="fs-5 mb-3">题目语法与界面预览</h3>
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card shadow-sm h-100">
          <div class="card-header">题目语法示例</div>
          <div class="card-body">
            <p class="text-muted small mb-3">
              用下划线标记答案位置，方括号标记选项。在首页编辑即可实时预览。
            </p>
            <div v-for="example in examples" :key="example.label">
              <p class="about-demo__syntax-label mb-1">{{ example.label }}</p>
              <pre class="about-demo__syntax mb-0">{{ example.syntax }}</pre>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card shadow-sm h-100">
          <div class="card-header">首页界面</div>
          <div class="card-body">
            <p class="text-muted small mb-3">从编辑到预览，一切在一个页面完成。</p>
            <img
              :src="homeScreenshot"
              alt="_txt_ 首页界面预览"
              class="about-demo__img"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
