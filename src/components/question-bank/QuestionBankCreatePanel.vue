<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import { saveAs } from "file-saver";
import Step1ModeSwitch from "../home/Step1ModeSwitch.vue";
import Step1ManualPanel from "../home/Step1ManualPanel.vue";
import { appState } from "../../state/appState";
import {
  createBankFromQuestions,
  updateBankFromQuestions
} from "../../services/questionBank";
import { questionBankState } from "../../state/questionBankState";
import { syncHomeSessionProgress } from "../../services/homeQuestionsJson";
import { questionsToTxtEntries } from "../../services/questionsToTxtEntries";
import { normalizeQuestionWithDetection, resolveQuestionBankVersion } from "../../utils/questions";
import { getTime } from "../../utils/time";
import type { Question } from "../../models/question/types";
import type { QuestionBankRecord } from "../../state/questionBankState";

const Step1AiPanel = defineAsyncComponent(() => import("../home/Step1AiPanel.vue"));

type Step1Mode = "manual" | "ai";
type SaveTarget = "browser" | "file";

interface LocalBankDraft {
  title: string;
  subject: string;
  author: string;
}

interface ImportedQuestionJson {
  version: string;
  name: string;
  type: string;
  author: string;
  questions: Question[];
}

const props = defineProps<{
  editingBank?: QuestionBankRecord | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [bankId: string];
  practice: [bankId: string];
}>();

const step1Mode = ref<Step1Mode>("manual");
const jsonAdvancedOpen = ref(false);
const localBankDraft = ref<LocalBankDraft>({ title: "", subject: "", author: "" });
const localBankMessage = ref("");
const exportFileName = ref("");
const saveTargets = ref<SaveTarget[]>(["browser"]);
const lastSavedBankId = ref("");
const QUESTION_JSON_VERSION = "0.0.2";

const isEditing = computed(() => Boolean(props.editingBank?.id));
const questionCount = computed(() => appState.questionsJSON.questions.length);

function resetCreateWorkspace() {
  appState.txts = [{ txt: "", MD5: false, image: "", noDelete: false, explanation: "" }];
  appState.questionsJSON = {
    bankId: "",
    bankSource: "",
    version: QUESTION_JSON_VERSION,
    name: "",
    type: "",
    author: "",
    questions: []
  };
  localBankDraft.value = { title: "", subject: "", author: "" };
  localBankMessage.value = "";
  lastSavedBankId.value = "";
  jsonAdvancedOpen.value = false;
  step1Mode.value = "manual";
}

function loadEditingBank(bank: QuestionBankRecord) {
  const questions = (Array.isArray(bank.questions) ? bank.questions : []).map((question) =>
    normalizeQuestionWithDetection(question)
  );
  appState.txts = questionsToTxtEntries(questions);
  appState.questionsJSON = {
    bankId: bank.id,
    bankSource: "local",
    version: resolveQuestionBankVersion(questions),
    name: bank.title || bank.name || "",
    type: bank.subject || bank.type || "",
    author: bank.author || "",
    questions
  };
  localBankDraft.value = {
    title: bank.title || bank.name || "",
    subject: bank.subject || bank.type || "",
    author: bank.author || ""
  };
  localBankMessage.value = "";
  lastSavedBankId.value = bank.id;
  jsonAdvancedOpen.value = false;
  step1Mode.value = "manual";
}

watch(
  () => props.editingBank?.id,
  () => {
    if (props.editingBank?.id) {
      loadEditingBank(props.editingBank);
    } else {
      resetCreateWorkspace();
    }
  },
  { immediate: true }
);

function normalizeQuestionJSON(
  raw: Partial<ImportedQuestionJson> | null | undefined
): ImportedQuestionJson {
  return {
    version: QUESTION_JSON_VERSION,
    name: raw?.name || "",
    type: raw?.type || "",
    author: raw?.author || "",
    questions: Array.isArray(raw?.questions) ? raw.questions : []
  };
}

async function clearQuestions() {
  appState.questionsJSON.questions = [];
  appState.questionsJSON.name = isEditing.value ? localBankDraft.value.title : "";
  appState.questionsJSON.type = isEditing.value ? localBankDraft.value.subject : "";
  appState.questionsJSON.author = isEditing.value ? localBankDraft.value.author : "";
  if (!isEditing.value) {
    appState.questionsJSON.bankId = "";
    appState.questionsJSON.bankSource = "";
  }
  const { resetQuestionProgress } = await import("../../models/question/progress");
  resetQuestionProgress([]);
}

function getFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  for (let index = 0; index < input.files.length; index += 1) {
    const reader = new FileReader();
    reader.readAsText(input.files[index]);
    reader.onload = async function load(this: FileReader) {
      const imported = normalizeQuestionJSON(JSON.parse(String(this.result ?? "")));
      if (!appState.questionsJSON.type && imported.type) {
        appState.questionsJSON.type = imported.type;
      }
      if (!appState.questionsJSON.author && imported.author) {
        appState.questionsJSON.author = imported.author;
      }
      if (!appState.questionsJSON.name && imported.name) {
        appState.questionsJSON.name = imported.name;
      }
      if (!localBankDraft.value.title && imported.name) {
        localBankDraft.value.title = imported.name;
      }
      if (!localBankDraft.value.subject && imported.type) {
        localBankDraft.value.subject = imported.type;
      }
      if (!localBankDraft.value.author && imported.author) {
        localBankDraft.value.author = imported.author;
      }
      Object.values(imported.questions || {}).forEach((item) => {
        appState.questionsJSON.questions.push(normalizeQuestionWithDetection(item));
      });
      appState.questionsJSON.version = resolveQuestionBankVersion(appState.questionsJSON.questions);
      appState.txts = questionsToTxtEntries(appState.questionsJSON.questions);
      await syncHomeSessionProgress(appState.questionsJSON.questions);
      localBankMessage.value = `已导入 ${imported.questions.length} 题，请保存到本地题库后再开始做题。`;
    };
  }
  input.value = "";
}

function normalizeMetaFromDraft() {
  appState.questionsJSON.name = localBankDraft.value.title.trim();
  appState.questionsJSON.type = localBankDraft.value.subject.trim();
  appState.questionsJSON.author = localBankDraft.value.author.trim();
}

function buildExportFilename() {
  const time = new Date();
  const yyyymmdd = `${time.getFullYear()}${String(time.getMonth() + 1).padStart(2, "0")}${String(time.getDate()).padStart(2, "0")}`;
  const name = appState.questionsJSON.name || "未命名题集";
  const type = appState.questionsJSON.type || "未分类";
  const author = appState.questionsJSON.author || "佚名";
  return `${name}-${type}-${author}-${yyyymmdd}.json`;
}

function exportQuestionJSON() {
  if (!appState.questionsJSON.questions.length) {
    localBankMessage.value = "当前没有可导出的题目，请先生成或导入。";
    return;
  }
  normalizeMetaFromDraft();
  const time = new Date();
  const normalizedFilename = exportFileName.value.trim() || buildExportFilename();
  const finalFilename = normalizedFilename.endsWith(".json")
    ? normalizedFilename
    : `${normalizedFilename}.json`;
  appState.questionsJSON.CreateTime = getTime(time);
  appState.questionsJSON.version = resolveQuestionBankVersion(appState.questionsJSON.questions);
  const blob = new Blob([JSON.stringify(appState.questionsJSON)], {
    type: "text/json;charset=utf-8"
  });
  saveAs(blob, finalFilename);
  localBankMessage.value = `已导出：${finalFilename}`;
}

function syncExportFileNameFromDraft() {
  const name = localBankDraft.value.title.trim() || "未命名题集";
  const type = localBankDraft.value.subject.trim() || "未分类";
  const author = localBankDraft.value.author.trim() || "佚名";
  const yyyymmdd = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;
  exportFileName.value = `${name}-${type}-${author}-${yyyymmdd}.json`;
}

function openSaveExportModal() {
  localBankDraft.value = {
    title: localBankDraft.value.title || appState.questionsJSON.name || "",
    subject: localBankDraft.value.subject || appState.questionsJSON.type || "",
    author: localBankDraft.value.author || appState.questionsJSON.author || ""
  };
  exportFileName.value = buildExportFilename();
  saveTargets.value = ["browser"];
  localBankMessage.value = "";
}

function saveByTarget() {
  if (!saveTargets.value.length) {
    localBankMessage.value = "请至少选择一个保存目标。";
    return;
  }
  if (saveTargets.value.includes("browser")) {
    saveToLocalBank();
  }
  if (saveTargets.value.includes("file")) {
    exportQuestionJSON();
  }
}

function saveToLocalBank() {
  if (!appState.questionsJSON.questions.length) {
    localBankMessage.value = "当前没有可保存的题目，请先生成或导入。";
    return;
  }
  normalizeMetaFromDraft();

  if (isEditing.value && props.editingBank?.id) {
    const result = updateBankFromQuestions("local", props.editingBank.id, {
      ...localBankDraft.value,
      questions: appState.questionsJSON.questions
    });
    if (!result.ok) {
      questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
      localBankMessage.value = result.message;
      return;
    }
    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
    lastSavedBankId.value = props.editingBank.id;
    localBankMessage.value = "已更新本地题集。";
    emit("saved", props.editingBank.id);
    return;
  }

  const result = createBankFromQuestions("local", {
    ...localBankDraft.value,
    questions: appState.questionsJSON.questions
  });
  if (!result.ok) {
    questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
    localBankMessage.value = result.message;
    return;
  }
  questionBankState.localBanks = result.banks as typeof questionBankState.localBanks;
  const createdId = result.banks[0]?.id || "";
  lastSavedBankId.value = createdId;
  localBankMessage.value = "已保存到本地题库。";
  if (createdId) emit("saved", createdId);
}

function handlePracticeAfterSave() {
  if (!lastSavedBankId.value) {
    localBankMessage.value = "请先保存到本地题库。";
    return;
  }
  emit("practice", lastSavedBankId.value);
}

const questionJSONPreview = computed(() => {
  const arr: Question[] = [];
  appState.questionsJSON.questions.forEach((q) => {
    if (q.image !== "") {
      arr.push({ ...q, image: "因数据过大，不予显示" });
    } else {
      arr.push(q);
    }
  });
  return JSON.stringify(
    {
      version: resolveQuestionBankVersion(appState.questionsJSON.questions),
      name: appState.questionsJSON.name || "",
      type: appState.questionsJSON.type || "",
      author: appState.questionsJSON.author || "",
      questions: arr
    },
    null,
    2
  );
});

function handleClose() {
  emit("close");
}
</script>

<template>
  <div class="qb-create-panel card shadow-sm mb-3">
    <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
      <span class="fw-semibold">{{ isEditing ? "编辑题集内容" : "新建题集" }}</span>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="handleClose">
        关闭
      </button>
    </div>
    <div class="card-body">
      <section class="mb-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 class="h6 mb-0">录入题目</h3>
          <Step1ModeSwitch v-model="step1Mode" />
        </div>
        <Step1ManualPanel v-show="step1Mode === 'manual'" />
        <Step1AiPanel v-if="step1Mode === 'ai'" />
      </section>

      <section class="mb-3">
        <h3 class="h6 mb-2">整理与入库</h3>
        <p class="small text-muted mb-2">
          手动模式请先「生成 JSON」；也可导入 JSON 合并题目。保存到本地题库后即可开始做题。
        </p>
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <input
            class="form-control"
            style="max-width: 18rem"
            type="file"
            accept=".json,application/json"
            multiple
            @change="getFile"
          />
          <button
            type="button"
            class="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#qbCreateSaveModal"
            @click="openSaveExportModal"
          >
            <i class="fas fa-save me-1"></i>保存到题库
          </button>
          <button
            v-if="lastSavedBankId"
            type="button"
            class="btn btn-success"
            @click="handlePracticeAfterSave"
          >
            <i class="fas fa-play me-1"></i>开始做题
          </button>
          <span class="small text-muted">当前 {{ questionCount }} 题</span>
        </div>
        <div v-if="localBankMessage" class="alert alert-secondary py-2 mb-2">
          {{ localBankMessage }}
        </div>

        <button
          type="button"
          class="btn btn-link btn-sm px-0"
          @click="jsonAdvancedOpen = !jsonAdvancedOpen"
        >
          {{ jsonAdvancedOpen ? "收起高级：JSON 预览" : "高级：JSON 预览" }}
        </button>
        <div v-if="jsonAdvancedOpen" class="mt-2">
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-danger" @click="clearQuestions">
              清空题目
            </button>
          </div>
          <textarea
            class="form-control font-monospace small qb-create-json"
            readonly
            :value="questionJSONPreview"
            rows="8"
          />
        </div>
      </section>
    </div>
  </div>

  <div
    class="modal fade"
    id="qbCreateSaveModal"
    tabindex="-1"
    aria-labelledby="qbCreateSaveModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="qbCreateSaveModalLabel">
            {{ isEditing ? "更新本地题集" : "保存到本地题库" }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">保存目标</label>
            <div class="d-flex flex-wrap gap-3">
              <div class="form-check">
                <input
                  id="qb-save-target-browser"
                  v-model="saveTargets"
                  class="form-check-input"
                  type="checkbox"
                  value="browser"
                />
                <label class="form-check-label" for="qb-save-target-browser">
                  <i class="fas fa-globe me-1"></i>保存到浏览器
                </label>
              </div>
              <div class="form-check">
                <input
                  id="qb-save-target-file"
                  v-model="saveTargets"
                  class="form-check-input"
                  type="checkbox"
                  value="file"
                />
                <label class="form-check-label" for="qb-save-target-file">
                  <i class="fas fa-file-export me-1"></i>导出文件
                </label>
              </div>
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label">题集名称</label>
            <input
              v-model="localBankDraft.title"
              class="form-control"
              placeholder="例如：高一数学-函数"
              @input="syncExportFileNameFromDraft"
            />
          </div>
          <div class="mb-2">
            <label class="form-label">类型</label>
            <input
              v-model="localBankDraft.subject"
              class="form-control"
              placeholder="例如：数学"
              @input="syncExportFileNameFromDraft"
            />
          </div>
          <div>
            <label class="form-label">作者</label>
            <input
              v-model="localBankDraft.author"
              class="form-control"
              placeholder="例如：RedCrazyGhost"
              @input="syncExportFileNameFromDraft"
            />
          </div>
          <div v-if="saveTargets.includes('file')" class="mt-2">
            <label class="form-label">导出文件名（可修改）</label>
            <input
              v-model="exportFileName"
              class="form-control"
              placeholder="例如：题集名称-类别-作者-20260425.json"
            />
          </div>
          <div v-if="localBankMessage" class="alert alert-secondary mt-3 mb-0 py-2">
            {{ localBankMessage }}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-primary" @click="saveByTarget">
            <i class="fas fa-save me-1"></i>保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qb-create-json {
  white-space: pre;
  font-size: 0.75rem;
}
</style>
