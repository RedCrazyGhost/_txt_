import { ref } from "vue";
import type { EditorPaneId } from "../services/editorLayoutPrefs";

const DRAG_MIME = "application/x-txt-editor-pane";

export function useEditorPaneReorder(options: {
  onSwap: (from: EditorPaneId, to: EditorPaneId) => void;
}) {
  const draggingPane = ref<EditorPaneId | null>(null);
  const dropTargetPane = ref<EditorPaneId | null>(null);

  function onDragStart(event: DragEvent, paneId: EditorPaneId) {
    draggingPane.value = paneId;
    dropTargetPane.value = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(DRAG_MIME, paneId);
      event.dataTransfer.setData("text/plain", paneId);
    }
  }

  function onDragEnd() {
    draggingPane.value = null;
    dropTargetPane.value = null;
  }

  function onDragOver(event: DragEvent, paneId: EditorPaneId) {
    if (!draggingPane.value || draggingPane.value === paneId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    dropTargetPane.value = paneId;
  }

  function onDragLeave(paneId: EditorPaneId) {
    if (dropTargetPane.value === paneId) dropTargetPane.value = null;
  }

  function onDrop(event: DragEvent, paneId: EditorPaneId) {
    event.preventDefault();
    const from =
      draggingPane.value ||
      (event.dataTransfer?.getData(DRAG_MIME) as EditorPaneId | undefined) ||
      (event.dataTransfer?.getData("text/plain") as EditorPaneId | undefined);
    dropTargetPane.value = null;
    draggingPane.value = null;
    if (!from || from === paneId) return;
    if (from !== "list" && from !== "preview" && from !== "edit") return;
    options.onSwap(from, paneId);
  }

  return {
    draggingPane,
    dropTargetPane,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop
  };
}
