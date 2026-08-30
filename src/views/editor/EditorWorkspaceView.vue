<script setup lang="ts">
import { defineAsyncComponent, ref, watch } from "vue";
import { appState } from "../../state/appState";
import EditorPageChrome from "../../components/editor/EditorPageChrome.vue";
import EditorQuestionPreview from "../../components/editor/EditorQuestionPreview.vue";
import EditorQuestionEditor from "../../components/editor/EditorQuestionEditor.vue";
import EditorSplitHandle from "../../components/editor/EditorSplitHandle.vue";
import EditorWorkspaceToolbar from "../../components/editor/EditorWorkspaceToolbar.vue";
import EditorListPane from "../../components/editor/EditorListPane.vue";
import StartPracticeChoiceModal from "../../components/practice/StartPracticeChoiceModal.vue";
import { useQuestionEditorSession } from "../../composables/useQuestionEditorSession";
import { useEditorWorkspaceLayout } from "../../composables/useEditorWorkspaceLayout";

const Step1AiPanel = defineAsyncComponent(
  () => import("../../components/home/Step1AiPanel.vue")
);
const JsonVersionDocModal = defineAsyncComponent(
  () => import("../../components/home/JsonVersionDocModal.vue")
);

const generatingQuestionSet = ref(false);
const bodyRef = ref<HTMLElement | null>(null);
const activeNavIndex = ref(appState.txts.length ? 0 : -1);

const {
  lastSavedBankId,
  isEditMode,
  isDraft,
  loadError,
  autosaveMessage,
  localBankDraft,
  localBankMessage,
  questionJSONPreview,
  questionCount,
  txtCount,
  getFile,
  syncExportFileNameFromDraft,
  generateAndSaveToLocalBank,
  goPracticeAfterSave,
  addEmptyTxt,
  startPracticeModalVisible,
  startPracticeBank,
  startPracticeLatest,
  startPracticeIncompleteCount,
  confirmResumePractice,
  confirmCreatePractice,
  cancelStartPractice
} = useQuestionEditorSession({ idPrefix: "editor-workspace" });

const {
  splitting,
  splittingAxis,
  order,
  rightTab,
  centerView,
  isLeftStack,
  gridStyle,
  leftSplitStyle,
  rightSplitStyle,
  stackSplitStyle,
  draggingPane,
  dropTargetPane,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  panePlacementStyle,
  expandSide,
  toggleDistribution,
  setRightTab,
  setCenterView,
  edgeLabel,
  isPaneCollapsed,
  startSplitDrag,
  startStackSplitDrag,
  expandListIfCollapsed
} = useEditorWorkspaceLayout(bodyRef);

async function generateQuestionSet() {
  generatingQuestionSet.value = true;
  try {
    await generateAndSaveToLocalBank();
  } finally {
    generatingQuestionSet.value = false;
  }
}

function selectNav(index: number) {
  activeNavIndex.value = index;
  expandListIfCollapsed();
}

function onAddFromEditor() {
  activeNavIndex.value = appState.txts.length - 1;
}

function addFromSidebar() {
  addEmptyTxt();
  activeNavIndex.value = appState.txts.length - 1;
}

watch(
  () => appState.txts.length,
  (len) => {
    if (len === 0) {
      activeNavIndex.value = -1;
      return;
    }
    if (activeNavIndex.value < 0) activeNavIndex.value = 0;
    if (activeNavIndex.value >= len) activeNavIndex.value = len - 1;
  }
);
</script>

<template>
  <div
    class="editor-ide editor-page"
    :class="{ 'is-splitting': splitting, 'is-splitting-row': splitting && splittingAxis === 'row' }"
  >
    <div class="editor-ide__chrome px-3 px-lg-4 pt-3">
      <EditorPageChrome
        title="题集编辑"
        subtitle="拖栏头换位 · 拖分隔条改宽/收起 · 图标切换分布 · 配置本地保存。"
        :question-count="questionCount"
        :txt-count="txtCount"
        :is-edit-mode="isEditMode"
        :is-draft="isDraft"
        :autosave-message="autosaveMessage"
        :load-error="loadError"
      >
        <template #toolbar>
          <EditorWorkspaceToolbar
            :local-bank-draft="localBankDraft"
            :local-bank-message="localBankMessage"
            :is-left-stack="isLeftStack"
            :last-saved-bank-id="lastSavedBankId"
            :is-draft="isDraft"
            :generating-question-set="generatingQuestionSet"
            :txt-count="txtCount"
            @sync-draft="syncExportFileNameFromDraft"
            @toggle-distribution="toggleDistribution"
            @import-change="getFile"
            @practice="goPracticeAfterSave"
            @generate="generateQuestionSet"
          />
        </template>
      </EditorPageChrome>
    </div>

    <div
      ref="bodyRef"
      class="editor-ide__body px-3 px-lg-4 pb-3"
      :class="{ 'editor-ide__body--stack': isLeftStack }"
      :style="gridStyle"
    >
      <template v-for="(paneId, slotIndex) in order" :key="paneId">
        <EditorListPane
          v-if="paneId === 'list'"
          :slot-index="slotIndex"
          :placement-style="panePlacementStyle(slotIndex)"
          :collapsed="isPaneCollapsed(slotIndex)"
          :is-drop-target="dropTargetPane === 'list'"
          :is-dragging="draggingPane === 'list'"
          :active-nav-index="activeNavIndex"
          @expand="expandSide"
          @select-nav="selectNav"
          @add="addFromSidebar"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
          @drag-over="onDragOver"
          @drag-leave="onDragLeave"
          @drop="onDrop"
        />

        <!-- PREVIEW -->
        <section
          v-else-if="paneId === 'preview'"
          class="editor-ide__pane editor-ide__pane--preview"
          :class="{
            'is-collapsed': isPaneCollapsed(slotIndex),
            'is-drop-target': dropTargetPane === 'preview',
            'is-dragging': draggingPane === 'preview'
          }"
          :style="panePlacementStyle(slotIndex)"
          aria-label="题目预览"
          @dragover="onDragOver($event, 'preview')"
          @dragleave="onDragLeave('preview')"
          @drop="onDrop($event, 'preview')"
        >
          <div v-if="isPaneCollapsed(slotIndex)" class="editor-ide__rail">
            <button
              type="button"
              class="editor-ide__rail-btn"
              title="展开预览"
              @click="expandSide(slotIndex === 0 ? 'left' : 'right')"
            >
              <i class="fas fa-eye" aria-hidden="true"></i>
              <span class="editor-ide__rail-label">预览</span>
            </button>
          </div>
          <template v-else>
            <div class="editor-ide__center-head">
              <div class="editor-ide__pane-head-left">
                <span
                  class="editor-ide__drag-grip"
                  draggable="true"
                  title="拖动换位"
                  @dragstart="onDragStart($event, 'preview')"
                  @dragend="onDragEnd"
                >
                  <i class="fas fa-grip-vertical" aria-hidden="true"></i>
                </span>
                <span class="editor-ide__center-title">
                  {{ centerView === "question" ? "题目预览" : "JSON 文本" }}
                </span>
                <button
                  v-if="centerView === 'json'"
                  type="button"
                  class="btn btn-sm btn-outline-secondary editor-ide__json-doc-trigger"
                  data-bs-toggle="modal"
                  data-bs-target="#jsonVersionDocModal"
                  aria-label="查看 JSON 版本说明"
                  title="JSON 版本说明"
                >
                  <i class="fas fa-question-circle" aria-hidden="true"></i>
                </button>
              </div>
              <div class="d-flex align-items-center gap-2">
                <div class="editor-view-switch" role="radiogroup" aria-label="预览显示样式">
                  <span
                    class="editor-view-switch__thumb"
                    :class="{ 'is-json': centerView === 'json' }"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    class="editor-view-switch__btn"
                    role="radio"
                    :aria-checked="centerView === 'question'"
                    :class="{ 'is-active': centerView === 'question' }"
                    @click="setCenterView('question')"
                  >
                    <i class="fas fa-eye me-1" aria-hidden="true"></i>题集
                  </button>
                  <button
                    type="button"
                    class="editor-view-switch__btn"
                    role="radio"
                    :aria-checked="centerView === 'json'"
                    :class="{ 'is-active': centerView === 'json' }"
                    @click="setCenterView('json')"
                  >
                    <i class="fas fa-code me-1" aria-hidden="true"></i>JSON
                  </button>
                </div>
              </div>
            </div>
            <div class="editor-ide__center-main">
              <EditorQuestionPreview
                v-show="centerView === 'question'"
                v-model="activeNavIndex"
              />
              <div v-show="centerView === 'json'" class="editor-ide__json-view">
                <textarea
                  class="form-control font-monospace small editor-ide__json-textarea"
                  readonly
                  :value="questionJSONPreview"
                  aria-label="JSON 预览"
                />
              </div>
            </div>
          </template>
        </section>

        <!-- EDIT | AI -->
        <aside
          v-else
          class="editor-ide__pane editor-ide__pane--edit"
          :class="{
            'is-collapsed': isPaneCollapsed(slotIndex),
            'is-drop-target': dropTargetPane === 'edit',
            'is-dragging': draggingPane === 'edit'
          }"
          :style="panePlacementStyle(slotIndex)"
          aria-label="编辑与 AI"
          @dragover="onDragOver($event, 'edit')"
          @dragleave="onDragLeave('edit')"
          @drop="onDrop($event, 'edit')"
        >
          <div v-if="isPaneCollapsed(slotIndex)" class="editor-ide__rail">
            <button
              type="button"
              class="editor-ide__rail-btn"
              title="展开编辑"
              @click="expandSide(slotIndex === 0 ? 'left' : 'right')"
            >
              <i class="fas fa-pen" aria-hidden="true"></i>
              <span class="editor-ide__rail-label">{{ edgeLabel("edit") }}</span>
            </button>
          </div>
          <template v-else>
            <div class="editor-ide__pane-head editor-ide__pane-head--tabs">
              <div class="editor-ide__pane-head-left">
                <span
                  class="editor-ide__drag-grip"
                  draggable="true"
                  title="拖动换位"
                  @dragstart="onDragStart($event, 'edit')"
                  @dragend="onDragEnd"
                >
                  <i class="fas fa-grip-vertical" aria-hidden="true"></i>
                </span>
                <div
                  class="editor-view-switch editor-view-switch--edit"
                  role="radiogroup"
                  aria-label="编辑栏功能"
                >
                  <span
                    class="editor-view-switch__thumb"
                    :class="{ 'is-json': rightTab === 'ai' }"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    class="editor-view-switch__btn"
                    role="radio"
                    :aria-checked="rightTab === 'edit'"
                    :class="{ 'is-active': rightTab === 'edit' }"
                    @click="setRightTab('edit')"
                  >
                    <i class="fas fa-pen me-1" aria-hidden="true"></i>编辑
                  </button>
                  <button
                    type="button"
                    class="editor-view-switch__btn"
                    role="radio"
                    :aria-checked="rightTab === 'ai'"
                    :class="{ 'is-active': rightTab === 'ai' }"
                    @click="setRightTab('ai')"
                  >
                    <i class="fas fa-robot me-1" aria-hidden="true"></i>AI
                  </button>
                </div>
              </div>
            </div>
            <div
              class="editor-ide__pane-body"
              :class="{ 'editor-ide__ai-body': rightTab === 'ai', 'p-0': rightTab === 'edit' }"
            >
              <EditorQuestionEditor
                v-show="rightTab === 'edit'"
                v-model="activeNavIndex"
                @add="onAddFromEditor"
              />
              <Step1AiPanel v-if="rightTab === 'ai'" />
            </div>
          </template>
        </aside>
      </template>

      <EditorSplitHandle
        side="left"
        :style="leftSplitStyle"
        @drag-start="startSplitDrag('left', $event)"
      />
      <EditorSplitHandle
        v-if="!isLeftStack"
        side="right"
        :style="rightSplitStyle"
        @drag-start="startSplitDrag('right', $event)"
      />
      <EditorSplitHandle
        v-else
        orientation="horizontal"
        :style="stackSplitStyle"
        @drag-start="startStackSplitDrag"
      />
    </div>

    <StartPracticeChoiceModal
      :visible="startPracticeModalVisible"
      :bank-name="startPracticeBank?.title || startPracticeBank?.name || '未命名题集'"
      :latest="startPracticeLatest"
      :incomplete-count="startPracticeIncompleteCount"
      @resume="confirmResumePractice"
      @create="confirmCreatePractice"
      @cancel="cancelStartPractice"
    />
    <JsonVersionDocModal />
  </div>
</template>

<style>
.editor-ide {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 7.5rem);
}

.editor-ide.is-splitting {
  cursor: col-resize;
  user-select: none;
}

.editor-ide.is-splitting-row {
  cursor: row-resize;
}

.editor-ide__dist-btn {
  width: 2rem;
  padding-left: 0;
  padding-right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.editor-ide__chrome :deep(.editor-chrome) {
  margin-bottom: 0.75rem;
}

.editor-ide__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.65rem 0.75rem;
  align-items: center;
}

.editor-ide__draft-fields {
  display: flex;
  flex: 1 1 16rem;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  min-width: 0;
}

.editor-ide__draft-fields .form-control {
  flex: 1 1 7rem;
  min-width: 6.5rem;
  max-width: 12rem;
}

.editor-ide__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  margin-left: auto;
}

.editor-ide__action-group {
  flex-wrap: nowrap;
}

.editor-ide__action-group > .btn {
  white-space: nowrap;
}

.editor-ide__generate-btn {
  font-weight: 650;
  padding: 0.45rem 1.05rem;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--bs-primary) 55%, transparent),
    0 3px 10px color-mix(in srgb, var(--bs-primary) 32%, transparent);
}

.editor-ide__generate-btn:not(:disabled):hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--bs-primary) 65%, transparent),
    0 4px 14px color-mix(in srgb, var(--bs-primary) 38%, transparent);
}

.editor-ide__generate-btn:disabled {
  box-shadow: none;
}

.editor-ide__body {
  flex: 1 1 auto;
  min-height: 28rem;
  display: grid;
  gap: 0;
  align-items: stretch;
}

.editor-ide__pane {
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--editor-radius, 0.65rem);
  background: var(--bs-card-bg);
  box-shadow: var(--editor-shadow, 0 0.125rem 0.35rem rgba(0, 0, 0, 0.05));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.editor-ide__pane.is-drop-target {
  border-color: color-mix(in srgb, var(--bs-primary) 55%, var(--bs-border-color));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bs-primary) 22%, transparent);
}

.editor-ide__pane.is-dragging {
  opacity: 0.72;
}

.editor-ide__pane-head,
.editor-ide__center-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--bs-emphasis-color);
}

.editor-ide__pane-head--tabs {
  padding: 0.45rem 0.55rem;
}

.editor-ide__pane-head-left {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.editor-ide__drag-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.3rem;
  color: var(--bs-secondary-color);
  cursor: grab;
}

.editor-ide__drag-grip:active {
  cursor: grabbing;
}

.editor-ide__drag-grip:hover {
  color: var(--bs-primary);
  background: color-mix(in srgb, var(--bs-primary) 10%, transparent);
}

.editor-ide__pane-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0.65rem;
}

.editor-ide__ai-body {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
}

.editor-ide__ai-body :deep(.step1-ai-panel),
.editor-ide__ai-body :deep(.step1-ai-dialog) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.editor-ide__ai-body :deep(.step1-ai-dialog) {
  border: 0;
  border-radius: 0.45rem;
}

.editor-ide__ai-body :deep(.step1-ai-dialog-messages) {
  max-height: none;
  flex: 1 1 auto;
  min-height: 0;
}

.editor-ide__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.editor-ide__nav-item {
  width: 100%;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  padding: 0.45rem 0.5rem;
  background: transparent;
  color: var(--bs-body-color);
}

.editor-ide__nav-item:hover {
  background: var(--bs-tertiary-bg);
}

.editor-ide__nav-item.is-active {
  border-color: color-mix(in srgb, var(--bs-primary) 45%, var(--bs-border-color));
  background: color-mix(in srgb, var(--bs-primary) 12%, transparent);
}

.editor-ide__nav-index {
  flex: 0 0 auto;
  min-width: 1.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--bs-secondary-color);
}

.editor-ide__nav-item.is-active .editor-ide__nav-index {
  color: var(--bs-primary);
}

.editor-ide__nav-preview {
  font-size: 0.8125rem;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.editor-ide__center-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--bs-emphasis-color);
}

.editor-view-switch {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 0.18rem;
  border-radius: 999px;
  border: 1px solid var(--bs-border-color);
  background: var(--bs-tertiary-bg);
  min-width: 10.5rem;
}

.editor-view-switch--edit {
  min-width: 9.5rem;
}

.editor-view-switch__thumb {
  position: absolute;
  top: 0.18rem;
  bottom: 0.18rem;
  left: 0.18rem;
  width: calc(50% - 0.18rem);
  border-radius: 999px;
  background: var(--bs-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
  z-index: 0;
}

.editor-view-switch__thumb.is-json {
  transform: translateX(100%);
}

.editor-view-switch__btn {
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
  line-height: 1.2;
}

.editor-view-switch__btn.is-active {
  color: #fff;
}

.editor-ide__center-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-ide__json-view {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
}

.editor-ide__json-doc-trigger {
  line-height: 1;
}

.editor-ide__json-textarea {
  flex: 1 1 auto;
  min-height: 14rem;
  white-space: pre;
  font-size: 0.75rem;
  overflow: auto;
  resize: none;
  background-color: var(--bs-tertiary-bg);
}

.editor-ide__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 0.5rem 0.2rem;
  background: var(--bs-tertiary-bg);
}

.editor-ide__rail-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--bs-secondary-color);
  padding: 0.55rem 0.2rem;
  border-radius: 0.4rem;
}

.editor-ide__rail-btn:hover {
  color: var(--bs-primary);
  background: color-mix(in srgb, var(--bs-primary) 10%, transparent);
}

.editor-ide__rail-label {
  writing-mode: vertical-rl;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

@media (max-width: 991.98px) {
  .editor-ide__body {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: none !important;
    grid-auto-rows: minmax(14rem, auto);
  }

  .editor-ide__body .editor-ide__pane,
  .editor-ide__body :deep(.editor-split) {
    grid-column: auto !important;
    grid-row: auto !important;
  }

  .editor-ide__body :deep(.editor-split) {
    display: none;
  }
}
</style>
