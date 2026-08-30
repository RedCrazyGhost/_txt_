<script setup lang="ts">
withDefaults(
  defineProps<{
    /** left = adjust left column; right = adjust right column (vertical separators) */
    side?: "left" | "right";
    orientation?: "vertical" | "horizontal";
    disabled?: boolean;
  }>(),
  {
    side: "left",
    orientation: "vertical",
    disabled: false
  }
);

const emit = defineEmits<{
  dragStart: [event: PointerEvent];
}>();
</script>

<template>
  <div
    class="editor-split"
    :class="{
      'is-disabled': disabled,
      [`editor-split--${side}`]: orientation === 'vertical',
      'editor-split--horizontal': orientation === 'horizontal',
      'editor-split--vertical': orientation === 'vertical'
    }"
    role="separator"
    :aria-orientation="orientation"
    :aria-disabled="disabled ? 'true' : 'false'"
    :tabindex="disabled ? -1 : 0"
    @pointerdown.prevent="!disabled && emit('dragStart', $event)"
  >
    <span class="editor-split__bar" aria-hidden="true" />
  </div>
</template>

<style scoped>
.editor-split {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  touch-action: none;
  user-select: none;
  background: transparent;
}

.editor-split--vertical {
  cursor: col-resize;
}

.editor-split--horizontal {
  cursor: row-resize;
  align-items: center;
  flex-direction: column;
}

.editor-split__bar {
  border-radius: 999px;
  background: var(--bs-border-color);
  transition: background-color 0.15s ease, width 0.15s ease, height 0.15s ease;
}

.editor-split--vertical .editor-split__bar {
  width: 2px;
  margin: 0.35rem 0;
}

.editor-split--horizontal .editor-split__bar {
  height: 2px;
  width: auto;
  align-self: stretch;
  margin: 0 0.35rem;
}

.editor-split--vertical:hover .editor-split__bar,
.editor-split--vertical:focus-visible .editor-split__bar {
  width: 3px;
  background: var(--bs-primary);
}

.editor-split--horizontal:hover .editor-split__bar,
.editor-split--horizontal:focus-visible .editor-split__bar {
  height: 3px;
  background: var(--bs-primary);
}

.editor-split.is-disabled {
  cursor: default;
  pointer-events: none;
  opacity: 0.35;
}
</style>
