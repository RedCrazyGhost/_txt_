<script setup lang="ts">
import { computed } from "vue";
import {
  ProgressStatus,
  buildNotebookAncestorChain,
  getBankSourceLabel,
  type BankNotebookGroup as BankNotebookGroupType,
  type EnrichedNotebook
} from "../../services/practiceProgress";
import ProgressRecordCard from "./ProgressRecordCard.vue";

const props = defineProps<{
  group: BankNotebookGroupType;
  notebookById: Map<string, EnrichedNotebook>;
  canResume: (notebook: EnrichedNotebook) => boolean;
}>();

defineEmits<{
  resume: [notebook: EnrichedNotebook];
  wrong: [notebook: EnrichedNotebook];
  delete: [notebook: EnrichedNotebook];
}>();

const sourceLabels = computed(() => {
  const sources = props.group.sources?.length
    ? props.group.sources
    : props.group.bankSource
      ? [props.group.bankSource]
      : [];
  return [...new Set(sources)].map((source) => getBankSourceLabel(source));
});

function flattenNotebooks(notebooks: EnrichedNotebook[]): EnrichedNotebook[] {
  const rows: EnrichedNotebook[] = [];
  notebooks.forEach((notebook) => {
    rows.push(notebook);
    if (notebook.children.length) {
      rows.push(...flattenNotebooks(notebook.children));
    }
  });
  return rows;
}

const allNotebooks = computed(() => {
  const rows = flattenNotebooks(props.group.notebooks);
  rows.push(...flattenNotebooks(props.group.orphanWrongNotebooks));
  return rows;
});

const notebookCount = computed(() => allNotebooks.value.length);

const inProgressCount = computed(
  () => allNotebooks.value.filter((item) => item.status === ProgressStatus.IN_PROGRESS).length
);

const hasWrongCount = computed(
  () => allNotebooks.value.filter((item) => item.wrongQuestionCount > 0).length
);

function orphanSourceChain(notebook: EnrichedNotebook) {
  return buildNotebookAncestorChain(notebook, props.notebookById);
}
</script>

<template>
  <section class="card shadow-sm bank-notebook-group">
    <div class="card-header d-flex justify-content-between align-items-start flex-wrap gap-2">
      <div class="flex-grow-1 min-w-0">
        <h3 class="h5 mb-2">{{ group.name || "未命名题集" }}</h3>
        <div class="d-flex flex-wrap gap-1 group-meta-tags">
          <span
            v-for="label in sourceLabels"
            :key="`source-${label}`"
            class="badge rounded-pill text-bg-light border"
          >
            {{ label }}
          </span>
          <span v-if="group.type" class="badge rounded-pill text-bg-light border">
            类型：{{ group.type }}
          </span>
          <span v-if="group.author" class="badge rounded-pill text-bg-light border">
            作者：{{ group.author }}
          </span>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-1 group-summary-badges">
        <span class="badge text-bg-secondary">{{ notebookCount }} 本</span>
        <span v-if="inProgressCount > 0" class="badge text-bg-warning">
          进行中 {{ inProgressCount }}
        </span>
        <span v-if="hasWrongCount > 0" class="badge text-bg-danger">
          有错题 {{ hasWrongCount }}
        </span>
      </div>
    </div>

    <div class="list-group list-group-flush">
      <ProgressRecordCard
        v-for="notebook in group.notebooks"
        :key="notebook.id"
        :notebook="notebook"
        :can-resume="canResume(notebook)"
        :can-resume-child="canResume"
        embedded
        @resume="$emit('resume', $event)"
        @wrong="$emit('wrong', $event)"
        @delete="$emit('delete', $event)"
      />
      <ProgressRecordCard
        v-for="notebook in group.orphanWrongNotebooks"
        :key="notebook.id"
        :notebook="notebook"
        :can-resume="canResume(notebook)"
        :can-resume-child="canResume"
        :source-chain="orphanSourceChain(notebook)"
        orphan-root
        embedded
        @resume="$emit('resume', $event)"
        @wrong="$emit('wrong', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.group-meta-tags .badge,
.group-summary-badges .badge {
  font-weight: 500;
}
</style>
