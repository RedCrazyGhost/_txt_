<script setup lang="ts">
const capabilities = [
  {
    title: "题集编辑与导入",
    items: [
      "将笔记文本整理为题集，支持填空、单选、多选",
      "支持 JSON 文件导入与导出，便于备份与分享",
      "首页支持 AI 辅助生成题目"
    ]
  },
  {
    title: "题库管理",
    items: [
      "本地题库新增、编辑、删除与搜索",
      "从内置远程题库下载到本地继续练习",
      "题集按类型组织，便于分类管理"
    ]
  },
  {
    title: "做题练习",
    items: [
      "选择题集即可开始练习",
      "答题结果记录与复盘",
      "练习进度自动保存与恢复"
    ]
  },
  {
    title: "QuestionJSON 格式",
    items: [
      "统一题集数据结构（version / name / type / author / questions）",
      "便于跨题集导入导出",
      "与项目题库目录规范一致"
    ]
  }
];
</script>

<template>
  <section class="mb-4 about-reveal">
    <h3 class="fs-5 mb-3">核心功能</h3>
    <div class="row g-3">
      <div v-for="cap in capabilities" :key="cap.title" class="col-md-6">
        <div class="card shadow-sm h-100">
          <div class="card-header">{{ cap.title }}</div>
          <div class="card-body">
            <ul class="mb-0 ps-3">
              <li v-for="item in cap.items" :key="item" class="mb-2">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
