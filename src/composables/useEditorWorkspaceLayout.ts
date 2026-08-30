import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { useEditorPaneReorder } from "./useEditorPaneReorder";
import {
  EDITOR_COLLAPSE_THRESHOLD_PX,
  EDITOR_RAIL_WIDTH_PX,
  EDITOR_SIDE_MIN_PX,
  EDITOR_SPLIT_WIDTH_PX,
  clampDragSideWidth,
  loadEditorLayoutPrefs,
  normalizeHeights,
  normalizeWidths,
  saveEditorLayoutPrefs,
  swapPaneOrder,
  type EditorCenterView,
  type EditorDistribution,
  type EditorLayoutPrefs,
  type EditorPaneId,
  type EditorRightTab
} from "../services/editorLayoutPrefs";

export function useEditorWorkspaceLayout(bodyRef: Ref<HTMLElement | null>) {
  const splitting = ref(false);
  const splittingAxis = ref<"col" | "row">("col");
  const layout = ref<EditorLayoutPrefs>(loadEditorLayoutPrefs());

  const order = computed(() => layout.value.order);
  const distribution = computed({
    get: () => layout.value.distribution,
    set: (value: EditorDistribution) => {
      layout.value.distribution = value;
    }
  });
  const leftCollapsed = computed({
    get: () => layout.value.leftCollapsed,
    set: (value: boolean) => {
      layout.value.leftCollapsed = value;
    }
  });
  const rightCollapsed = computed({
    get: () => layout.value.rightCollapsed,
    set: (value: boolean) => {
      layout.value.rightCollapsed = value;
    }
  });
  const rightTab = computed({
    get: () => layout.value.rightTab,
    set: (value: EditorRightTab) => {
      layout.value.rightTab = value;
    }
  });
  const centerView = computed({
    get: () => layout.value.centerView,
    set: (value: EditorCenterView) => {
      layout.value.centerView = value;
    }
  });

  const leftColPx = computed(() =>
    leftCollapsed.value ? EDITOR_RAIL_WIDTH_PX : layout.value.widths.left
  );
  const rightColPx = computed(() =>
    rightCollapsed.value ? EDITOR_RAIL_WIDTH_PX : layout.value.widths.right
  );
  const isLeftStack = computed(() => distribution.value === "leftStack");

  const gridStyle = computed(() => {
    if (isLeftStack.value) {
      return {
        gridTemplateColumns: `${leftColPx.value}px ${EDITOR_SPLIT_WIDTH_PX}px minmax(0, 1fr)`,
        gridTemplateRows: `${layout.value.heights.top}px ${EDITOR_SPLIT_WIDTH_PX}px minmax(0, 1fr)`
      };
    }
    return {
      gridTemplateColumns: `${leftColPx.value}px ${EDITOR_SPLIT_WIDTH_PX}px minmax(0, 1fr) ${EDITOR_SPLIT_WIDTH_PX}px ${rightColPx.value}px`,
      gridTemplateRows: "minmax(0, 1fr)"
    };
  });

  function panePlacementStyle(slotIndex: number): Record<string, string> {
    if (isLeftStack.value) {
      if (slotIndex === 0) return { gridColumn: "1", gridRow: "1 / -1" };
      if (slotIndex === 1) return { gridColumn: "3", gridRow: "1" };
      return { gridColumn: "3", gridRow: "3" };
    }
    const col = String(slotIndex * 2 + 1);
    return { gridColumn: col, gridRow: "1" };
  }

  const leftSplitStyle = computed(() =>
    isLeftStack.value
      ? { gridColumn: "2", gridRow: "1 / -1" }
      : { gridColumn: "2", gridRow: "1" }
  );

  const rightSplitStyle = computed(() => ({ gridColumn: "4", gridRow: "1" }));

  const stackSplitStyle = computed(() => ({ gridColumn: "3", gridRow: "2" }));

  function persistLayout() {
    saveEditorLayoutPrefs(layout.value);
  }

  const {
    draggingPane,
    dropTargetPane,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop
  } = useEditorPaneReorder({
    onSwap: (from, to) => {
      layout.value.order = swapPaneOrder(layout.value.order, from, to);
      persistLayout();
    }
  });

  function expandSide(side: "left" | "right") {
    if (side === "left") {
      leftCollapsed.value = false;
      layout.value.userTouchedLeft = true;
    } else {
      rightCollapsed.value = false;
      layout.value.userTouchedRight = true;
    }
    persistLayout();
  }

  function toggleDistribution() {
    distribution.value = isLeftStack.value ? "columns" : "leftStack";
    persistLayout();
  }

  function setRightTab(tab: EditorRightTab) {
    rightTab.value = tab;
    persistLayout();
  }

  function setCenterView(view: EditorCenterView) {
    centerView.value = view;
    persistLayout();
  }

  function applyAutoCollapse(width: number) {
    if (isLeftStack.value) {
      if (!layout.value.userTouchedLeft) {
        leftCollapsed.value = width < 768;
      }
      return;
    }
    if (!layout.value.userTouchedRight) {
      rightCollapsed.value = width < 1200;
    }
    if (!layout.value.userTouchedLeft) {
      leftCollapsed.value = width < 768;
    }
  }

  function onWindowResize() {
    applyAutoCollapse(window.innerWidth);
    const containerWidth = bodyRef.value?.clientWidth;
    const containerHeight = bodyRef.value?.clientHeight;
    if (containerWidth) {
      layout.value.widths = normalizeWidths(layout.value.widths, containerWidth);
    }
    if (containerHeight) {
      layout.value.heights = normalizeHeights(layout.value.heights, containerHeight);
    }
  }

  function edgeLabel(paneId: EditorPaneId): string {
    if (paneId === "list") return "列表";
    if (paneId === "preview") return "预览";
    return "编辑";
  }

  function isPaneCollapsed(slotIndex: number): boolean {
    if (isLeftStack.value) {
      return slotIndex === 0 && leftCollapsed.value;
    }
    return (slotIndex === 0 && leftCollapsed.value) || (slotIndex === 2 && rightCollapsed.value);
  }

  function collapseSideFromWidth(side: "left" | "right", width: number): boolean {
    if (width >= EDITOR_COLLAPSE_THRESHOLD_PX) return false;
    if (side === "left") {
      leftCollapsed.value = true;
      layout.value.userTouchedLeft = true;
    } else {
      rightCollapsed.value = true;
      layout.value.userTouchedRight = true;
    }
    return true;
  }

  function startSplitDrag(side: "left" | "right", event: PointerEvent) {
    if (isLeftStack.value && side === "right") return;

    const rawTarget = (event.currentTarget || event.target) as HTMLElement | null;
    const handle = rawTarget?.closest?.(".editor-split") as HTMLElement | null;
    if (!handle) return;

    const startX = event.clientX;
    const startLeft = layout.value.widths.left;
    const startRight = layout.value.widths.right;
    const wasCollapsed = side === "left" ? leftCollapsed.value : rightCollapsed.value;
    const containerWidth = bodyRef.value?.clientWidth ?? window.innerWidth;
    splitting.value = true;
    splittingAxis.value = "col";

    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;

      if (side === "left") {
        if (wasCollapsed || leftCollapsed.value) {
          const opened = EDITOR_RAIL_WIDTH_PX + dx;
          if (opened < EDITOR_COLLAPSE_THRESHOLD_PX) {
            leftCollapsed.value = true;
            return;
          }
          leftCollapsed.value = false;
          layout.value.userTouchedLeft = true;
          layout.value.widths = {
            left: clampDragSideWidth(Math.max(EDITOR_SIDE_MIN_PX, opened), containerWidth, startRight),
            right: startRight
          };
          return;
        }

        const nextLeft = clampDragSideWidth(startLeft + dx, containerWidth, startRight);
        if (collapseSideFromWidth("left", nextLeft)) return;
        layout.value.widths = { left: Math.max(EDITOR_SIDE_MIN_PX, nextLeft), right: startRight };
        return;
      }

      if (wasCollapsed || rightCollapsed.value) {
        const opened = EDITOR_RAIL_WIDTH_PX - dx;
        if (opened < EDITOR_COLLAPSE_THRESHOLD_PX) {
          rightCollapsed.value = true;
          return;
        }
        rightCollapsed.value = false;
        layout.value.userTouchedRight = true;
        layout.value.widths = {
          left: startLeft,
          right: clampDragSideWidth(Math.max(EDITOR_SIDE_MIN_PX, opened), containerWidth, startLeft)
        };
        return;
      }

      const nextRight = clampDragSideWidth(startRight - dx, containerWidth, startLeft);
      if (collapseSideFromWidth("right", nextRight)) return;
      layout.value.widths = { left: startLeft, right: Math.max(EDITOR_SIDE_MIN_PX, nextRight) };
    };

    const onUp = (upEvent: PointerEvent) => {
      splitting.value = false;
      try {
        handle.releasePointerCapture(upEvent.pointerId);
      } catch {
        /* already released */
      }
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      if (!leftCollapsed.value && !rightCollapsed.value) {
        layout.value.widths = normalizeWidths(layout.value.widths, containerWidth);
      } else if (!leftCollapsed.value) {
        layout.value.widths = {
          left: normalizeWidths(layout.value.widths, containerWidth).left,
          right: layout.value.widths.right
        };
      } else if (!rightCollapsed.value) {
        layout.value.widths = {
          left: layout.value.widths.left,
          right: normalizeWidths(layout.value.widths, containerWidth).right
        };
      }
      persistLayout();
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function startStackSplitDrag(event: PointerEvent) {
    const rawTarget = (event.currentTarget || event.target) as HTMLElement | null;
    const handle = rawTarget?.closest?.(".editor-split") as HTMLElement | null;
    if (!handle) return;

    const startY = event.clientY;
    const startTop = layout.value.heights.top;
    const containerHeight = bodyRef.value?.clientHeight ?? window.innerHeight;
    splitting.value = true;
    splittingAxis.value = "row";

    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const dy = moveEvent.clientY - startY;
      layout.value.heights = normalizeHeights({ top: startTop + dy }, containerHeight);
    };

    const onUp = (upEvent: PointerEvent) => {
      splitting.value = false;
      try {
        handle.releasePointerCapture(upEvent.pointerId);
      } catch {
        /* already released */
      }
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      layout.value.heights = normalizeHeights(layout.value.heights, containerHeight);
      persistLayout();
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  /** Expand list pane when selecting a nav item while collapsed. */
  function expandListIfCollapsed() {
    const listSlot = order.value.indexOf("list");
    if (isLeftStack.value) {
      if (listSlot === 0 && leftCollapsed.value) {
        leftCollapsed.value = false;
        layout.value.userTouchedLeft = true;
        persistLayout();
      }
      return;
    }
    if (listSlot === 0 && leftCollapsed.value) {
      leftCollapsed.value = false;
      layout.value.userTouchedLeft = true;
      persistLayout();
    } else if (listSlot === 2 && rightCollapsed.value) {
      rightCollapsed.value = false;
      layout.value.userTouchedRight = true;
      persistLayout();
    }
  }

  onMounted(() => {
    if (!layout.value.userTouchedLeft && !layout.value.userTouchedRight) {
      applyAutoCollapse(window.innerWidth);
    }
    const containerWidth = bodyRef.value?.clientWidth;
    const containerHeight = bodyRef.value?.clientHeight;
    if (containerWidth) {
      layout.value.widths = normalizeWidths(layout.value.widths, containerWidth);
    }
    if (containerHeight) {
      layout.value.heights = normalizeHeights(layout.value.heights, containerHeight);
    }
    window.addEventListener("resize", onWindowResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", onWindowResize);
    persistLayout();
  });

  return {
    splitting,
    splittingAxis,
    layout,
    order,
    distribution,
    leftCollapsed,
    rightCollapsed,
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
    persistLayout,
    expandSide,
    toggleDistribution,
    setRightTab,
    setCenterView,
    edgeLabel,
    isPaneCollapsed,
    startSplitDrag,
    startStackSplitDrag,
    expandListIfCollapsed
  };
}
