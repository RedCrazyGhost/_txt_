<script setup lang="ts">
withDefaults(
  defineProps<{
    token?: string;
    owner?: string;
    repo?: string;
    statusMessage?: string;
  }>(),
  {
    token: "",
    owner: "",
    repo: "",
    statusMessage: ""
  }
);

const emit = defineEmits<{
  "update:token": [value: string];
  "update:owner": [value: string];
  "update:repo": [value: string];
}>();

function onTokenInput(event: Event) {
  emit("update:token", (event.target as HTMLInputElement).value);
}

function onOwnerInput(event: Event) {
  emit("update:owner", (event.target as HTMLInputElement).value);
}

function onRepoInput(event: Event) {
  emit("update:repo", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="card shadow-sm mb-3">
    <div class="card-header">本地题库上传到 GitHub Issues</div>
    <div class="card-body">
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label">Owner</label>
          <input
            class="form-control"
            :value="owner"
            @input="onOwnerInput"
            placeholder="仓库所有者"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">Repo</label>
          <input
            class="form-control"
            :value="repo"
            @input="onRepoInput"
            placeholder="仓库名"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">GitHub Token</label>
          <input
            class="form-control"
            type="password"
            :value="token"
            @input="onTokenInput"
            placeholder="仅运行时使用，不持久化"
          />
        </div>
      </div>
      <p class="small text-muted mt-2 mb-0">
        仅用于本地题库的“上传 Issues”操作。推荐 Token 权限：repo，Token 仅保存在当前页面内存中，刷新即失效。
      </p>
      <div class="alert alert-secondary mt-3 mb-0 py-2" v-if="statusMessage">{{ statusMessage }}</div>
    </div>
  </div>
</template>

