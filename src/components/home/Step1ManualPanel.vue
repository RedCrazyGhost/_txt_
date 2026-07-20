<script setup lang="ts">
import { nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import { appState, type TxtEntry } from "../../state/appState";
import { generateQuestionsJsonFromTxts } from "../../services/homeQuestionsJson";
import { txtCharNumber } from "../../utils/questions";

const activeTxtIndex = ref(-1);
const manuallyCollapsedExplanation = ref(new Set<number>());
const manuallyExpandedExplanation = ref(new Set<number>());
const explanationInputRefs = ref<Record<number, HTMLTextAreaElement>>({});

function remapIndexSet(set: Set<number>, deletedIndex: number): Set<number> {
  const next = new Set<number>();
  for (const i of set) {
    if (i < deletedIndex) next.add(i);
    else if (i > deletedIndex) next.add(i - 1);
  }
  return next;
}

function boxMinHeight(txt: string): number {
  return 2.5 + txtCharNumber(txt) * 1.5;
}

function getLineNumbers(txt: string): number[] {
  return Array.from({ length: txtCharNumber(txt) }, (_, index) => index + 1);
}

function md5ChangeColor(value: TxtEntry): string {
  if (!value.MD5) return "";
  return "var(--txt-md5-locked-bg)";
}

function addTxt() {
  appState.txts.push({ MD5: false, txt: "", image: "", noDelete: false, explanation: "" });
}

function deleteTxt(index: number) {
  if (appState.txts[index]?.noDelete) return;
  appState.txts.splice(index, 1);
  manuallyCollapsedExplanation.value = remapIndexSet(manuallyCollapsedExplanation.value, index);
  manuallyExpandedExplanation.value = remapIndexSet(manuallyExpandedExplanation.value, index);
}

function toggleNoDelete(index: number) {
  appState.txts[index].noDelete = !appState.txts[index].noDelete;
}

function changeMD5(index: number) {
  appState.txts[index].MD5 = !appState.txts[index].MD5;
}

function txtObjectMD5ShowIClass(index: number): string {
  return appState.txts[index].MD5 ? "fas fa-lock" : "fas fa-unlock";
}

function triggerInputFile(id: string) {
  const input = document.getElementById(id);
  if (input) input.click();
}

function getImageFile(event: Event, index: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function load(this: FileReader) {
    appState.txts[index].image = String(this.result ?? "");
  };
}

function deleteImage(index: number) {
  appState.txts[index].image = "";
}

function isExplanationExpanded(index: number): boolean {
  if (manuallyCollapsedExplanation.value.has(index)) return false;
  const txt = appState.txts[index];
  if (hasExplanationContent(txt)) return true;
  return manuallyExpandedExplanation.value.has(index);
}

function hasExplanationContent(value: TxtEntry): boolean {
  return Boolean(value.explanation?.trim());
}

watch(
  () => appState.txts.map((txt) => txt.explanation),
  (explanations) => {
    const next = new Set(manuallyCollapsedExplanation.value);
    let changed = false;
    explanations.forEach((explanation, index) => {
      if (!explanation?.trim() && next.delete(index)) {
        changed = true;
      }
    });
    if (changed) {
      manuallyCollapsedExplanation.value = next;
    }
  }
);

function explanationToggleTitle(index: number, value: TxtEntry): string {
  if (isExplanationExpanded(index)) return "收起解析";
  return hasExplanationContent(value) ? "展开解析（已有内容）" : "展开题目解析";
}

async function toggleExplanation(index: number) {
  if (isExplanationExpanded(index)) {
    const collapsed = new Set(manuallyCollapsedExplanation.value);
    collapsed.add(index);
    manuallyCollapsedExplanation.value = collapsed;
    const expanded = new Set(manuallyExpandedExplanation.value);
    expanded.delete(index);
    manuallyExpandedExplanation.value = expanded;
    return;
  }
  const collapsed = new Set(manuallyCollapsedExplanation.value);
  collapsed.delete(index);
  manuallyCollapsedExplanation.value = collapsed;
  if (!hasExplanationContent(appState.txts[index])) {
    manuallyExpandedExplanation.value = new Set([...manuallyExpandedExplanation.value, index]);
  }
  await nextTick();
  explanationInputRefs.value[index]?.focus();
}

function setExplanationRef(index: number, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLTextAreaElement) {
    explanationInputRefs.value[index] = el;
  } else {
    delete explanationInputRefs.value[index];
  }
}

async function generateQuestionsJSON() {
  await generateQuestionsJsonFromTxts();
}
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <p class="mb-0">题目示例:<span class="text-secondary">1+1=_2_</span></p>
      </div>
      <div v-if="appState.txts.length === 0">
        <button type="button" class="btn btn-primary"
         @click="addTxt">
          <i class="fas fa-plus"></i> 添加题目
        </button>
      </div>
    </div>
    <div class="row row-col-1">
      <div
        class="col-12 step1-question-item"
        v-for="(value, index) in appState.txts"
        :key="`txts-${index}`"
      >
        <div class="row" v-if="value.image !== ''">
          <img class="img-fluid" :src="value.image" :alt="`imag-${index}`" />
        </div>
        <div
          class="form-floating step1-question-editor"
          :class="{ 'step1-question-editor--explanation-open': isExplanationExpanded(index) }"
        >
          <div
            v-if="value.txt !== '' || activeTxtIndex === index"
            class="line-number-gutter"
            aria-hidden="true"
          >
            <span v-for="number in getLineNumbers(value.txt)" :key="`line-${index}-${number}`">
              {{ number }}
            </span>
          </div>
          <textarea
            class="form-control shadow-sm rounded"
            placeholder="_txt_"
            :id="`step1-txt-${index}`"
            :style="`padding-right:2rem;overflow-y:hidden;padding-left:3.2rem;resize:none;min-height:${boxMinHeight(value.txt)}rem;background-color:${md5ChangeColor(value)};line-height:1.5rem;font-size:1rem;`"
            v-model="value.txt"
            @focus="activeTxtIndex = index"
            @blur="activeTxtIndex = -1"
          />
          <label :for="`step1-txt-${index}`">题目 {{ index + 1 }}</label>
          <button
            type="button"
            class="btn btn-warning position-absolute top-0 start-100 translate-middle"
            @click="changeMD5(index)"
          >
            <i :class="txtObjectMD5ShowIClass(index)"></i>
          </button>
          <div
            style="z-index: 1"
            class="btn-group position-absolute top-100 start-100 translate-middle"
            role="group"
            aria-label="题目配图"
          >
            <button type="button" class="btn btn-warning" @click="triggerInputFile(`imageFile-${index}`)">
              <i class="fas fa-camera"></i>
              <input
                style="display: none"
                @change="getImageFile($event, index)"
                :id="`imageFile-${index}`"
                accept="image/*"
                type="file"
              />
            </button>
            <button
              v-if="value.image !== ''"
              type="button"
              class="btn btn-danger"
              @click="deleteImage(index)"
            >
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
          <button
            type="button"
            class="btn step1-explanation-toggle-btn position-absolute top-100 start-0 translate-middle"
            :class="{
              'step1-explanation-toggle-btn--open': isExplanationExpanded(index),
              'step1-explanation-toggle-btn--has-content': hasExplanationContent(value)
            }"
            :style="`top:${boxMinHeight(value.txt) - 2.35}rem`"
            :title="explanationToggleTitle(index, value)"
            :aria-expanded="isExplanationExpanded(index)"
            @click="toggleExplanation(index)"
          >
            <i
              class="fas"
              :class="isExplanationExpanded(index) ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </button>
          <div
            class="position-absolute d-flex justify-content-evenly align-items-center flex-wrap gap-2 w-100 px-1"
            :style="`top:${boxMinHeight(value.txt) - 1}rem;`"
          >
            <div :style="`z-index:2`">
              <button type="button"
               class="btn btn-primary" @click="addTxt">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div class="btn-group"
              :style="`z-index:2`"
             role="group" aria-label="删除与锁定">
              <button
                type="button"
                class="btn btn-danger"
                :disabled="value.noDelete"
                :title="value.noDelete ? '已锁定，请先解锁' : '删除本题'"
                @click="deleteTxt(index)"
              >
                <i class="fas fa-minus"></i>
              </button>
              <button
                type="button"
                class="btn btn-danger"
                :title="value.noDelete ? '已锁定，点击解锁' : '点击上锁，禁止删除'"
                @click="toggleNoDelete(index)"
              >
                <i :class="value.noDelete ? 'fas fa-lock' : 'fas fa-unlock'"></i>
              </button>
            </div>
          </div>
        </div>

        <div
          class="home-explanation-slide"
          :class="{ 'home-explanation-slide--open': isExplanationExpanded(index) }"
        >
          <div class="home-explanation-slide__inner">
            <div class="home-explanation-panel">
              <div class="home-explanation-panel__header">
                <label class="home-explanation-panel__label" :for="`step1-explanation-${index}`">
                  <i class="fas fa-lightbulb" aria-hidden="true"></i>
                  解析
                </label>
              </div>
              <textarea
                :ref="(el) => setExplanationRef(index, el)"
                class="form-control home-explanation-textarea"
                :id="`step1-explanation-${index}`"
                v-model="value.explanation"
                placeholder="输入题目解析、解题思路或补充说明…"
                rows="3"
              />
            </div>
          </div>
        </div>
      </div>
      <button
        v-if="appState.txts.length !== 0"
        type="button"
        class="btn btn-primary"
        @click="generateQuestionsJSON"
      >
        <i class="fas fa-file-signature fa-1x"></i> 生成JSON
      </button>
    </div>
  </div>
</template>

<style scoped>
.step1-question-item {
  margin-bottom: 4rem;
}

.form-floating {
  position: relative;
}

.line-number-gutter {
  position: absolute;
  left: 0.75rem;
  top: 1.6rem;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 1.5rem;
  color: var(--bs-gray);
  font-size: 1rem;
  line-height: 1.5rem;
  pointer-events: none;
  user-select: none;
}

.step1-explanation-toggle-btn {
  position: relative;
  z-index: 2;
  background-color: var(--home-explanation-btn-bg);
  border: 1px solid var(--home-explanation-btn-border);
  color: var(--home-explanation-btn-color);
  box-shadow: var(--home-explanation-btn-shadow);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.step1-explanation-toggle-btn:hover,
.step1-explanation-toggle-btn:focus-visible {
  background-color: var(--home-explanation-btn-hover-bg);
  border-color: var(--home-explanation-btn-hover-border);
  color: var(--home-explanation-btn-hover-color);
  box-shadow: var(--home-explanation-focus-ring);
}

.step1-explanation-toggle-btn--open {
  background-color: var(--home-explanation-btn-open-bg);
  border-color: var(--home-explanation-btn-open-border);
  color: var(--home-explanation-btn-open-color);
}

.step1-explanation-toggle-btn--has-content:not(.step1-explanation-toggle-btn--open) {
  background-color: var(--home-explanation-btn-has-content-bg);
  border-color: var(--home-explanation-btn-has-content-border);
  box-shadow: var(--home-explanation-btn-has-content-shadow);
}

.step1-explanation-toggle-btn--has-content:not(.step1-explanation-toggle-btn--open)::after {
  content: "";
  position: absolute;
  top: 0.18rem;
  right: 0.18rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background-color: var(--home-explanation-dot);
  border: 1.5px solid var(--home-explanation-dot-border);
  pointer-events: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.step1-question-editor--explanation-open .form-control {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
  box-shadow: none;
}

.home-explanation-slide {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.home-explanation-slide--open {
  grid-template-rows: 1fr;
}

.home-explanation-slide__inner {
  overflow: hidden;
}

.home-explanation-panel {
  padding: 0.65rem 0.75rem 0.8rem;
  border: 1px solid var(--home-explanation-panel-border);
  border-top: 1px dashed var(--home-explanation-panel-border-top);
  border-radius: 0 0 var(--bs-border-radius) var(--bs-border-radius);
  background: var(--home-explanation-panel-bg);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.home-explanation-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.home-explanation-panel__label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 0.3rem;
  background: var(--home-explanation-label-bg);
  color: var(--home-explanation-accent);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.home-explanation-panel__label .fa-lightbulb {
  font-size: 0.6875rem;
  opacity: 0.9;
}

.home-explanation-textarea {
  min-height: 5rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.55;
  border-color: var(--home-explanation-input-border);
  background-color: var(--home-explanation-input-bg);
  resize: vertical;
  box-shadow: var(--home-explanation-input-inset-shadow);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.home-explanation-textarea::placeholder {
  color: var(--bs-secondary-color);
  opacity: 0.75;
}

.home-explanation-textarea:focus {
  border-color: var(--home-explanation-input-focus-border);
  background-color: var(--home-explanation-input-bg);
  box-shadow:
    var(--home-explanation-input-inset-shadow),
    var(--home-explanation-focus-ring);
}

@media (prefers-reduced-motion: reduce) {
  .home-explanation-slide {
    transition: none;
  }
}
</style>
