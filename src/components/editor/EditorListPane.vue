<script setup lang="ts">
import { appState } from "../../state/appState";
import type { EditorPaneId } from "../../services/editorLayoutPrefs";

defineProps<{
  slotIndex: number;
  placementStyle: Record<string, string>;
  collapsed: boolean;
  isDropTarget: boolean;
  isDragging: boolean;
  activeNavIndex: number;
}>();

const emit = defineEmits<{
  expand: [side: "left" | "right"];
  selectNav: [index: number];
  add: [];
  dragStart: [event: DragEvent, paneId: EditorPaneId];
  dragEnd: [];
  dragOver: [event: DragEvent, paneId: EditorPaneId];
  dragLeave: [paneId: EditorPaneId];
  drop: [event: DragEvent, paneId: EditorPaneId];
}>();

function previewText(txt: string) {
  const trimmed = txt.trim();
  return trimmed ? trimmed.slice(0, 36) : "（空白题目）";
}
</script>

<template>
  <aside
    class="editor-ide__pane"
    :class="{
      'is-collapsed': collapsed,
      'is-drop-target': isDropTarget,
      'is-dragging': isDragging
    }"
    :style="placementStyle"
    aria-label="题目列表"
    @dragover="emit('dragOver', $event, 'list')"
    @dragleave="emit('dragLeave', 'list')"
    @drop="emit('drop', $event, 'list')"
  >
    <div v-if="collapsed" class="editor-ide__rail">
      <button
        type="button"
        class="editor-ide__rail-btn"
        title="展开列表"
        @click="emit('expand', slotIndex === 0 ? 'left' : 'right')"
      >
        <i class="fas fa-list" aria-hidden="true"></i>
        <span class="editor-ide__rail-label">列表</span>
      </button>
    </div>
    <template v-else>
      <div class="editor-ide__pane-head">
        <div class="editor-ide__pane-head-left">
          <span
            class="editor-ide__drag-grip"
            draggable="true"
            title="拖动换位"
            @dragstart="emit('dragStart', $event, 'list')"
            @dragend="emit('dragEnd')"
          >
            <i class="fas fa-grip-vertical" aria-hidden="true"></i>
          </span>
          <span>题目列表</span>
        </div>
      </div>
      <div class="editor-ide__pane-body">
        <ul class="editor-ide__list">
          <li v-for="(item, index) in appState.txts" :key="`nav-${index}`">
            <button
              type="button"
              class="editor-ide__nav-item"
              :class="{ 'is-active': activeNavIndex === index }"
              @click="emit('selectNav', index)"
            >
              <span class="editor-ide__nav-index">{{ index + 1 }}</span>
              <span class="editor-ide__nav-preview">{{ previewText(item.txt) }}</span>
            </button>
          </li>
        </ul>
        <button type="button" class="btn btn-sm btn-primary w-100 mt-2" @click="emit('add')">
          <i class="fas fa-plus me-1" aria-hidden="true"></i>添加题目
        </button>
      </div>
    </template>
  </aside>
</template>
