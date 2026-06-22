<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  buildQuestionReportIssueUrl,
  formatQuestionPreview,
  QUESTION_REPORT_TYPES
} from "../../services/questionReport";
import { appState } from "../../state/appState";
import { getQuestionType, getQuestionTypeBadgeClass, getQuestionTypeLabel } from "../../utils/questions";

const props = defineProps({
  question: { type: Object, required: true },
  qindex: { type: Number, required: true },
  bankContext: { type: Object, default: () => ({}) }
});

const visible = ref(false);
const selectedTypes = ref([]);
const userNote = ref("");

const canSubmit = computed(() => selectedTypes.value.length > 0);

const theme = computed(() =>
  appState.webSiteConfig.appColor === "dark" ? "dark" : "light"
);

const bankTitle = computed(() => props.bankContext?.name || "未命名题集");

const questionPreview = computed(() => formatQuestionPreview(props.question));

const questionTypeLabel = computed(() =>
  getQuestionTypeLabel(getQuestionType(props.question))
);

const questionTypeBadgeClass = computed(() =>
  getQuestionTypeBadgeClass(getQuestionType(props.question))
);

function resetForm() {
  selectedTypes.value = [];
  userNote.value = "";
}

function open() {
  resetForm();
  visible.value = true;
}

function close() {
  visible.value = false;
}

function toggleType(typeId) {
  if (selectedTypes.value.includes(typeId)) {
    selectedTypes.value = selectedTypes.value.filter((id) => id !== typeId);
    return;
  }
  selectedTypes.value = [...selectedTypes.value, typeId];
}

function submit() {
  if (!canSubmit.value) return;

  const { owner, repo } = appState.webSiteConfig.githubRepo;
  const url = buildQuestionReportIssueUrl({
    owner,
    repo,
    bank: props.bankContext,
    question: props.question,
    qindex: props.qindex,
    reportTypes: selectedTypes.value,
    userNote: userNote.value,
    appVersion: appState.webSiteConfig.appVersion
  });

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  close();
}

function handleKeydown(event) {
  if (event.key === "Escape") close();
}

watch(visible, (next) => {
  if (typeof document === "undefined") return;
  if (next) {
    document.addEventListener("keydown", handleKeydown);
    document.body.classList.add("question-report-modal-open");
    return;
  }
  document.removeEventListener("keydown", handleKeydown);
  document.body.classList.remove("question-report-modal-open");
});

onBeforeUnmount(() => {
  if (typeof document === "undefined") return;
  document.removeEventListener("keydown", handleKeydown);
  document.body.classList.remove("question-report-modal-open");
});

defineExpose({ open });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="question-report-shell"
      :data-bs-theme="theme"
      :style="{ fontFamily: appState.webSiteConfig.appFontFamily }"
    >
      <div class="modal-backdrop fade show" @click="close"></div>
      <div
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="questionReportModalLabel"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-sm question-report-card">
            <div class="modal-header question-report-header">
              <div class="question-report-heading">
                <h5 class="modal-title mb-1" id="questionReportModalLabel">
                  <i class="fas fa-flag text-warning me-2"></i>上报题目问题
                </h5>
                <div class="question-report-meta">
                  <span class="badge text-bg-secondary">第 {{ qindex + 1 }} 题</span>
                  <span class="badge question-type-badge" :class="questionTypeBadgeClass">
                    {{ questionTypeLabel }}
                  </span>
                </div>
              </div>
              <button type="button" class="btn-close" aria-label="关闭" @click="close"></button>
            </div>

            <div class="modal-body">
              <div class="question-report-context card shadow-sm mb-3">
                <div class="card-body py-3">
                  <div class="question-report-bank-title">{{ bankTitle }}</div>
                  <div class="small text-muted question-report-bank-meta">
                    <span v-if="bankContext.type" class="me-2">类型：{{ bankContext.type }}</span>
                    <span v-if="bankContext.author">作者：{{ bankContext.author }}</span>
                  </div>
                  <p class="question-report-preview mb-0 mt-2">{{ questionPreview }}</p>
                </div>
              </div>

              <div class="alert alert-secondary py-2 mb-3 question-report-hint">
                <i class="fab fa-github me-1"></i>
                选择问题类型并补充说明，确认后将打开 GitHub Issue 预填页（需登录后提交）。
              </div>

              <fieldset class="mb-3">
                <legend class="form-label mb-2 fw-semibold">问题类型（至少选一项）</legend>
                <div class="question-report-type-list">
                  <label
                    v-for="item in QUESTION_REPORT_TYPES"
                    :key="item.id"
                    class="question-report-type-option"
                    :class="{ 'is-selected': selectedTypes.includes(item.id) }"
                    :for="`report-type-${qindex}-${item.id}`"
                  >
                    <input
                      :id="`report-type-${qindex}-${item.id}`"
                      class="visually-hidden"
                      type="checkbox"
                      :checked="selectedTypes.includes(item.id)"
                      @change="toggleType(item.id)"
                    />
                    <span class="question-report-type-label">{{ item.label }}</span>
                  </label>
                </div>
              </fieldset>

              <div>
                <label class="form-label fw-semibold" :for="`report-note-${qindex}`">
                  补充说明（可选）
                </label>
                <textarea
                  :id="`report-note-${qindex}`"
                  v-model="userNote"
                  class="form-control question-report-note"
                  rows="4"
                  placeholder="请描述具体问题，便于维护者定位与修复"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer question-report-footer">
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="close">
                取消
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!canSubmit"
                @click="submit"
              >
                <i class="fab fa-github me-1"></i>前往 GitHub 提交
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.question-report-shell {
  position: fixed;
  inset: 0;
  z-index: 1055;
}

.question-report-shell .modal {
  z-index: 1056;
}

.question-report-shell .modal-backdrop {
  z-index: 1055;
}

.question-report-card {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--bs-card-bg, var(--bs-body-bg));
}

.question-report-header {
  border-bottom: 1px solid var(--bs-border-color);
  background-color: var(--bs-tertiary-bg);
  align-items: flex-start;
  gap: 0.75rem;
}

.question-report-heading {
  min-width: 0;
}

.question-report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.question-type-badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.question-report-context {
  border-color: var(--bs-border-color);
  background-color: var(--bs-body-bg);
}

.question-report-bank-title {
  font-weight: 600;
}

.question-report-preview {
  white-space: pre-line;
  color: var(--bs-body-color);
  font-size: 0.95rem;
  line-height: 1.5;
}

.question-report-hint {
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.question-report-type-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.question-report-type-option {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--bs-border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  margin-bottom: 0;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.question-report-type-option:hover {
  background: color-mix(in srgb, var(--bs-body-color) 5%, transparent);
}

.question-report-type-option.is-selected {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.08);
  color: var(--bs-primary);
  font-weight: 600;
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-primary-rgb), 0.12);
}

.question-report-type-label {
  line-height: 1.35;
}

.question-report-note {
  resize: vertical;
  min-height: 6rem;
}

.question-report-footer {
  border-top: 1px solid var(--bs-border-color);
  background-color: var(--bs-tertiary-bg);
}

@media (max-width: 576px) {
  .question-report-shell .modal-dialog {
    margin: 0.75rem;
  }

  .question-report-type-list {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
body.question-report-modal-open {
  overflow: hidden;
}

[data-bs-theme="dark"] .question-report-shell .question-report-header,
[data-bs-theme="dark"] .question-report-shell .modal-title,
[data-bs-theme="dark"] .question-report-shell .question-report-bank-title,
[data-bs-theme="dark"] .question-report-shell .question-report-preview {
  color: #ffffff;
}

[data-bs-theme="dark"] .question-report-shell .form-control {
  background-color: var(--bs-tertiary-bg);
  border-color: var(--bs-border-color);
  color: var(--bs-body-color);
}

[data-bs-theme="dark"] .question-report-shell .alert-secondary {
  --bs-alert-bg: #1e293b;
  --bs-alert-border-color: #334155;
  --bs-alert-color: #cbd5e1;
}
</style>
