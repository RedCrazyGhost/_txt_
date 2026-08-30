<script setup lang="ts">
import { computed, ref, watch } from "vue";

export interface GenerateWrongNotebookTarget {
  /** 用于重置选项的稳定键 */
  key: string;
  name: string;
  kindLabel: string;
  wrongQuestionCount: number;
  wrongWithPartialCount: number;
}

type WrongScope = "strict" | "partial";

const props = defineProps<{
  target: GenerateWrongNotebookTarget | null;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [includePartial: boolean];
}>();

const scope = ref<WrongScope>("strict");

const visible = computed(() => props.target !== null);

const kindLabel = computed(() => props.target?.kindLabel || "");
const bankName = computed(() => props.target?.name || "未命名题集");
const wrongCount = computed(() => props.target?.wrongQuestionCount ?? 0);
const wrongWithPartialCount = computed(() => props.target?.wrongWithPartialCount ?? 0);

const canStrict = computed(() => wrongCount.value > 0);
const canPartial = computed(() => wrongWithPartialCount.value > 0);

const canConfirm = computed(() =>
  scope.value === "partial" ? canPartial.value : canStrict.value
);

watch(
  () => props.target?.key,
  () => {
    scope.value = canStrict.value ? "strict" : "partial";
  }
);

function onConfirm() {
  if (!canConfirm.value) return;
  emit("confirm", scope.value === "partial");
}
</script>

<template>
  <div v-if="visible" class="generate-wrong-modal">
    <div class="generate-wrong-modal-backdrop" @click="emit('cancel')"></div>
    <div
      class="card shadow generate-wrong-modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-wrong-title"
    >
      <div class="card-body">
        <h5 id="generate-wrong-title" class="card-title">生成错题本</h5>
        <p class="mb-3">
          从《<strong>{{ bankName }}</strong>》这本{{ kindLabel }}生成错题本，写入练习档案后可继续复习。
        </p>

        <div class="mb-3" role="radiogroup" aria-label="错题范围">
          <div class="form-check">
            <input
              id="wrong-scope-strict"
              v-model="scope"
              class="form-check-input"
              type="radio"
              value="strict"
              :disabled="!canStrict"
            />
            <label class="form-check-label" for="wrong-scope-strict">
              仅错题
              <span class="text-muted">({{ wrongCount }})</span>
            </label>
          </div>
          <div class="form-check mt-2">
            <input
              id="wrong-scope-partial"
              v-model="scope"
              class="form-check-input"
              type="radio"
              value="partial"
              :disabled="!canPartial"
            />
            <label class="form-check-label" for="wrong-scope-partial">
              错题 + 半对
              <span class="text-muted">({{ wrongWithPartialCount }})</span>
            </label>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="emit('cancel')">
            取消
          </button>
          <button
            type="button"
            class="btn btn-danger btn-sm"
            :disabled="!canConfirm"
            @click="onConfirm"
          >
            确认生成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generate-wrong-modal {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.generate-wrong-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.generate-wrong-modal-dialog {
  position: relative;
  z-index: 1;
  width: min(32rem, 100%);
}
</style>
