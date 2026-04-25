<script setup>
defineProps({
  title: { type: String, required: true },
  banks: { type: Array, required: true },
  embedded: { type: Boolean, default: false },
  totalCount: { type: Number, default: undefined },
  showEdit: { type: Boolean, default: true },
  showPractice: { type: Boolean, default: false },
  showRemove: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
  showUpload: { type: Boolean, default: false },
  showDownload: { type: Boolean, default: false }
});

const emit = defineEmits(["edit", "remove", "export", "upload", "download", "practice"]);

function formatCreatedTime(item) {
  const raw = item?.CreateTime || item?.createTime || item?.updatedAt;
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleString();
}
</script>

<template>
  <div :class="['card shadow-sm', { 'border-0 shadow-none bg-transparent': embedded }]">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>{{ title }}</span>
      <span class="small text-muted" v-if="Number.isFinite(totalCount)">
        共 {{ totalCount }} 条，匹配 {{ banks.length }} 条
      </span>
      <span class="badge text-bg-secondary" v-else>{{ banks.length }} 个题库</span>
    </div>
    <div class="list-group list-group-flush" v-if="banks.length">
      <div class="list-group-item" v-for="item in banks" :key="item.id">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div class="question-bank-list-meta">
            <h6 class="mb-1">{{ item.title || "未命名题库" }}</h6>
            <div class="text-muted small">
              <span class="me-2">类型：{{ item.subject || "-" }}</span>
              <span class="me-2">作者：{{ item.author || "-" }}</span>
              <span>题目数：{{ item.questions?.length || 0 }}</span>
            </div>
            <div class="text-muted small">创建时间：{{ formatCreatedTime(item) }}</div>
          </div>
          <div class="question-bank-action-wrap d-flex flex-wrap gap-2">
            <button class="btn btn-outline-success btn-sm" v-if="showPractice" @click="emit('practice', item.id)">开始做题</button>
            <button class="btn btn-outline-primary btn-sm" v-if="showEdit" @click="emit('edit', item.id)">编辑</button>
            <button class="btn btn-outline-secondary btn-sm" v-if="showExport" @click="emit('export', item.id)">导出</button>
            <button class="btn btn-outline-info btn-sm" v-if="showUpload" @click="emit('upload', item.id)">上传 Issues</button>
            <button class="btn btn-outline-success btn-sm" v-if="showDownload" @click="emit('download', item.id)">下载到本地</button>
            <button class="btn btn-outline-danger btn-sm" v-if="showRemove" @click="emit('remove', item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body text-muted small" v-else>暂无题库数据</div>
  </div>
</template>

<style scoped>
.question-bank-list-meta {
  min-width: 12rem;
}

.question-bank-action-wrap {
  justify-content: flex-end;
}

@media (max-width: 992px) {
  .question-bank-action-wrap {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
