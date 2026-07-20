<script setup lang="ts">
import type { BankDraft } from "../../services/questionBank";

defineProps<{
  title: string;
  draft: BankDraft;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  save: [];
  cancel: [];
  import: [event: Event];
}>();

function onImport(event: Event) {
  emit("import", event);
}
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>{{ title }}</span>
      <span class="badge text-bg-secondary">{{ isEditing ? "编辑中" : "新建" }}</span>
    </div>
    <div class="card-body">
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label">题库名称</label>
          <input v-model="draft.title" class="form-control" placeholder="例如：高一数学函数题库" />
        </div>
        <div class="col-md-4">
          <label class="form-label">学科</label>
          <input v-model="draft.subject" class="form-control" placeholder="例如：数学" />
        </div>
        <div class="col-md-4">
          <label class="form-label">编者</label>
          <input v-model="draft.author" class="form-control" placeholder="例如：RedCrazyGhost" />
        </div>
        <div class="col-12">
          <label class="form-label">题目内容（每行一题）</label>
          <textarea
            v-model="draft.questionsText"
            class="form-control"
            rows="8"
            placeholder="每一行作为一道题"
          ></textarea>
        </div>
      </div>
    </div>
    <div class="card-footer d-flex flex-wrap gap-2">
      <button class="btn btn-primary" @click="emit('save')">
        <i class="fas fa-save me-1"></i>{{ isEditing ? "保存修改" : "新增题库" }}
      </button>
      <button class="btn btn-outline-secondary" @click="emit('cancel')" v-if="isEditing">
        取消编辑
      </button>
      <label class="btn btn-outline-primary mb-0">
        <i class="fas fa-file-import me-1"></i>导入 JSON
        <input class="d-none" type="file" accept=".json,application/json" @change="onImport" />
      </label>
    </div>
  </div>
</template>

