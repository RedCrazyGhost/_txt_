<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  questionCount: number;
  txtCount?: number;
  isEditMode?: boolean;
  isDraft?: boolean;
  autosaveMessage?: string;
  loadError?: string;
}>();
</script>

<template>
  <header class="editor-chrome mb-3">
    <div class="editor-chrome__heading">
      <div>
        <div class="editor-chrome__title-row">
          <h1 class="editor-chrome__title h4 mb-0">{{ title }}</h1>
          <span
            v-if="isDraft"
            class="editor-chrome__mode is-draft"
          >
            草稿
          </span>
          <span
            v-else
            class="editor-chrome__mode"
            :class="isEditMode ? 'is-edit' : 'is-create'"
          >
            {{ isEditMode ? "编辑已有题集" : "新建题集" }}
          </span>
          <span v-if="autosaveMessage" class="editor-chrome__autosave text-muted small">
            {{ autosaveMessage }}
          </span>
        </div>
        <p v-if="subtitle" class="text-muted small mb-0 mt-1">{{ subtitle }}</p>
      </div>
      <div class="editor-chrome__counts" aria-live="polite">
        <span class="editor-chrome__stat">
          <i class="fas fa-pen me-1" aria-hidden="true"></i>草稿 {{ txtCount ?? 0 }}
        </span>
        <span class="editor-chrome__stat">
          <i class="fas fa-code me-1" aria-hidden="true"></i>JSON {{ questionCount }}
        </span>
      </div>
    </div>

    <div v-if="loadError" class="alert alert-warning py-2 mt-3 mb-0">
      {{ loadError }}
    </div>

    <div v-if="$slots.toolbar" class="editor-chrome__toolbar mt-3">
      <slot name="toolbar" />
    </div>
  </header>
</template>

<style scoped>
.editor-chrome__title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.editor-chrome__mode {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  color: var(--bs-secondary-color);
}

.editor-chrome__mode.is-create {
  border-color: color-mix(in srgb, var(--bs-primary) 45%, var(--bs-border-color));
  color: var(--bs-primary);
  background: color-mix(in srgb, var(--bs-primary) 12%, transparent);
}

.editor-chrome__mode.is-edit {
  border-color: color-mix(in srgb, var(--bs-secondary) 35%, var(--bs-border-color));
  color: var(--bs-emphasis-color);
  background: var(--bs-tertiary-bg);
}

.editor-chrome__mode.is-draft {
  border-color: color-mix(in srgb, var(--bs-warning) 45%, var(--bs-border-color));
  color: var(--bs-warning-text-emphasis, var(--bs-warning));
  background: color-mix(in srgb, var(--bs-warning) 14%, transparent);
}

.editor-chrome__autosave {
  font-size: 0.75rem;
}

.editor-chrome__heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-end;
}

.editor-chrome__title {
  font-weight: 650;
  color: var(--bs-emphasis-color);
}

.editor-chrome__counts {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.editor-chrome__stat {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.55rem;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  background: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color-translucent);
}

.editor-chrome__toolbar {
  padding: 0.85rem 1rem;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--editor-radius, 0.65rem);
  background: var(--bs-card-bg);
  box-shadow: var(--editor-shadow, 0 0.125rem 0.35rem rgba(0, 0, 0, 0.05));
}
</style>
