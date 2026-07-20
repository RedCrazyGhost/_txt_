import { onUnmounted, ref, watch } from "vue";

export function useStep1AiFullscreen() {
  const isFullscreen = ref(false);

  function handleDocumentKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isFullscreen.value) {
      isFullscreen.value = false;
    }
  }

  function toggleFullscreen() {
    isFullscreen.value = !isFullscreen.value;
  }

  watch(isFullscreen, (value) => {
    document.body.style.overflow = value ? "hidden" : "";
    if (value) {
      document.addEventListener("keydown", handleDocumentKeydown);
    } else {
      document.removeEventListener("keydown", handleDocumentKeydown);
    }
  });

  onUnmounted(() => {
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleDocumentKeydown);
  });

  return {
    isFullscreen,
    toggleFullscreen
  };
}
