<script setup>
defineProps({
  token: { type: String, default: "" },
  owner: { type: String, default: "" },
  repo: { type: String, default: "" },
  statusMessage: { type: String, default: "" }
});

const emit = defineEmits(["update:token", "update:owner", "update:repo"]);
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
            @input="emit('update:owner', $event.target.value)"
            placeholder="仓库所有者"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">Repo</label>
          <input
            class="form-control"
            :value="repo"
            @input="emit('update:repo', $event.target.value)"
            placeholder="仓库名"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">GitHub Token</label>
          <input
            class="form-control"
            type="password"
            :value="token"
            @input="emit('update:token', $event.target.value)"
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

