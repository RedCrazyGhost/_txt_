<script setup>
import { ref } from "vue";
import { saveAs } from "file-saver";
import AppQuestion from "../components/AppQuestion.vue";
import AppName from "../components/AppName.vue";
import { appState } from "../state/appState";
import { createBankFromQuestions } from "../services/questionBank";
import {
  allAnswerNumber,
  buildQuestionsFromTxt,
  numberToPercent,
  trueAnswerNumber,
  txtCharNumber
} from "../utils/questions";
import { getTime } from "../utils/time";

function judgeColorChangeFontColor(color) {
  return color === "light" ? "dark" : "light";
}

function boxMinHeight(txt) {
  return 2.5 + txtCharNumber(txt) * 1.5;
}

function getLineNumbers(txt) {
  return Array.from({ length: txtCharNumber(txt) }, (_, index) => index + 1);
}

const activeTxtIndex = ref(-1);
const localBankDraft = ref({
  title: "",
  subject: "",
  author: ""
});
const localBankMessage = ref("");
const exportFileName = ref("");
const saveTargets = ref(["browser"]);
const QUESTION_JSON_VERSION = "0.0.2";

function normalizeQuestionJSON(raw) {
  return {
    version: QUESTION_JSON_VERSION,
    name: raw?.name || "",
    type: raw?.type || "",
    author: raw?.author || "",
    questions: Array.isArray(raw?.questions) ? raw.questions : []
  };
}

function md5ChangeColor(value) {
  return value.MD5 ? "#cecece" : "";
}

function addTxt() {
  appState.txts.push({ MD5: false, txt: "", image: "", noDelete: false });
}

function deleteTxt(index) {
  if (appState.txts[index]?.noDelete) return;
  appState.txts.splice(index, 1);
}

function toggleNoDelete(index) {
  appState.txts[index].noDelete = !appState.txts[index].noDelete;
}

function changeMD5(index) {
  appState.txts[index].MD5 = !appState.txts[index].MD5;
}

function txtObjectMD5ShowIClass(index) {
  return appState.txts[index].MD5 ? "fa fa-lock" : "fa fa-unlock";
}

function triggerInputFile(id) {
  const input = document.getElementById(id);
  if (input) input.click();
}

function getImageFile(event, index) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function load() {
    appState.txts[index].image = this.result;
  };
}

function deleteImage(index) {
  appState.txts[index].image = "";
}

function generateQuestionsJSON() {
  appState.questionsJSON.questions = buildQuestionsFromTxt(appState.txts, []);
}

function deleteQuestionsJSON() {
  appState.questionsJSON.questions = [];
  appState.questionsJSON.name = "";
  appState.questionsJSON.type = "";
  appState.questionsJSON.author = "";
}

function getFile(event) {
  for (let index = 0; index < event.target.files.length; index += 1) {
    const reader = new FileReader();
    reader.readAsText(event.target.files[index]);
    reader.onload = function load() {
      const imported = normalizeQuestionJSON(JSON.parse(this.result));
      if (!appState.questionsJSON.type && imported.type) {
        appState.questionsJSON.type = imported.type;
      }
      if (!appState.questionsJSON.author && imported.author) {
        appState.questionsJSON.author = imported.author;
      }
      if (!appState.questionsJSON.name && imported.name) {
        appState.questionsJSON.name = imported.name;
      }
      Object.values(imported.questions || {}).forEach((i) => {
        appState.questionsJSON.questions.push(i);
      });
      appState.questionsJSON.version = QUESTION_JSON_VERSION;
    };
  }
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
    localBankMessage.value = "当前没有可导出的题目，请先生成或导入 JSON。";
    return;
  }
  normalizeMetaFromDraft();
  const time = new Date();
  const normalizedFilename = exportFileName.value.trim() || buildExportFilename();
  const finalFilename = normalizedFilename.endsWith(".json")
    ? normalizedFilename
    : `${normalizedFilename}.json`;
  appState.questionsJSON.CreateTime = getTime(time);
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
    title: appState.questionsJSON.name || "",
    subject: appState.questionsJSON.type || "",
    author: appState.questionsJSON.author || ""
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
    localBankMessage.value = "当前没有可保存的题目，请先生成或导入 JSON。";
    return;
  }
  normalizeMetaFromDraft();
  createBankFromQuestions("local", {
    ...localBankDraft.value,
    questions: appState.questionsJSON.questions
  });
  localBankMessage.value = "已保存到本地题库，可在题库页面查看和管理。";
}

function questionJSONShow() {
  const arr = [];
  appState.questionsJSON.questions.forEach((q) => {
    if (q.image !== "") {
      arr.push({ ...q, image: "因数据过大，不予显示" });
    } else {
      arr.push(q);
    }
  });
  return JSON.stringify({
    version: QUESTION_JSON_VERSION,
    name: appState.questionsJSON.name || "",
    type: appState.questionsJSON.type || "",
    author: appState.questionsJSON.author || "",
    questions: arr
  });
}

function intro() {
  Promise.all([import("intro.js"), import("intro.js/minified/introjs.min.css")]).then(
    ([intro]) => {
      intro.default().setOptions({ showBullets: false }).start();
    }
  );
}

</script>

<template>
  <div>
    <div :class="`container-fluid bg-${appState.webSiteConfig.appColor} text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`">
      <div class="row">
        <div class="col-8 offset-2 text-center">
          <h1>What is <AppName /> ？</h1>
          <h2><AppName />是一个帮助人们进行知识巩固的网站</h2>
        </div>
      </div>
    </div>
    <div class="container-fluid">
      <div :class="`row bg-${appState.webSiteConfig.appColor}`">
        <div class="col-10 offset-1">
          <div class="accordion accordion-flush" id="accordionFlushExample">
            <div class="accordion-item" style="border-bottom-width: 0">
              <h2 class="accordion-header" id="Step1">
                <button
                  :class="`accordion-button accordion-button-${appState.webSiteConfig.appColor} collapsed fs-3 bg-${appState.webSiteConfig.appColor} text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#Step-1"
                  aria-expanded="false"
                  aria-controls="Step-1"
                >
                  Step 1
                </button>
              </h2>
              <div
                id="Step-1"
                :class="`accordion-collapse collapse show bg-${appState.webSiteConfig.appColor}`"
                aria-labelledby="Step1"
                data-bs-parent="#accordionFlushExample"
              >
                <div class="accordion-body">
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div :class="`text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`">
                      <p>题目示例:<span style="color: var(--bs-gray)">1+1=_2_</span></p>
                    </div>
                    <div data-title="Step1" data-intro="点击可添加题目框" v-if="appState.txts.length === 0">
                      <button type="button" class="btn btn-primary" @click="addTxt">
                        <i class="fas fa-plus"></i> 添加题目
                      </button>
                    </div>
                  </div>
                  <div class="row row-col-1">
                    <div class="col-12" v-for="(value, index) in appState.txts" :key="`txts-${index}`" style="margin-bottom: 4rem">
                      <div class="row" v-if="value.image !== ''">
                        <img class="img-fluid" :src="value.image" :alt="`imag-${index}`" />
                      </div>
                      <div class="form-floating" data-title="Step1" data-intro="根据题目示例编写需要生成的题目">
                        <div v-if="value.txt !== '' || activeTxtIndex === index" class="line-number-gutter" aria-hidden="true">
                          <span v-for="number in getLineNumbers(value.txt)" :key="`line-${index}-${number}`">
                            {{ number }}
                          </span>
                        </div>
                        <textarea
                          class="form-control shadow-sm rounded"
                          placeholder="_txt_"
                          id="Step-1-textarea"
                          :style="`padding-right:2rem;overflow-y:hidden;padding-left:3.2rem;resize:none;min-height:${boxMinHeight(value.txt)}rem;background-color:${md5ChangeColor(value)};line-height:1.5rem;font-size:1rem;`"
                          v-model="value.txt"
                          @focus="activeTxtIndex = index"
                          @blur="activeTxtIndex = -1"
                        />
                        <label for="Step-1-textarea">
                          题目 {{ index + 1 }}
                        </label>
                        <button
                          data-title="Step1"
                          data-intro="点击可对答案进行加密"
                          class="btn btn-warning position-absolute top-0 start-100 translate-middle"
                          @click="changeMD5(index)"
                        >
                          <i :class="txtObjectMD5ShowIClass(index)"></i>
                        </button>
                        <div
                          data-title="Step1"
                          data-intro="点击可添加图片"
                          style="z-index:1"
                          class="btn-group position-absolute top-100 start-100 translate-middle"
                          role="group"
                          aria-label="Basic example"
                        >
                          <button type="button" class="btn btn-warning" @click="triggerInputFile(`imageFile-${index}`)">
                            <i class="fa fa-camera"></i>
                            <input
                              style="display:none"
                              @change="getImageFile($event, index)"
                              :id="`imageFile-${index}`"
                              accept="image/*"
                              type="file"
                            />
                          </button>
                          <button v-if="value.image !== ''" type="button" class="btn btn-danger" @click="deleteImage(index)">
                            <i class="fa fa-trash-alt"></i>
                          </button>
                        </div>
                        <div
                          class="position-absolute d-flex justify-content-evenly align-items-center flex-wrap gap-2 w-100 px-1"
                          :style="`top:${boxMinHeight(value.txt) - 1}rem;`"
                        >
                          <div data-title="Step1" data-intro="点击可添加题目框">
                            <button type="button" class="btn btn-primary" @click="addTxt"><i class="fas fa-plus"></i></button>
                          </div>
                          <div class="btn-group" role="group" aria-label="删除与锁定">
                            <button
                              data-title="Step1"
                              data-intro="点击可移除题目框"
                              type="button"
                              class="btn btn-danger"
                              :disabled="value.noDelete"
                              :title="value.noDelete ? '已锁定，请先解锁' : '删除本题'"
                              @click="deleteTxt(index)"
                            >
                              <i class="fas fa-minus"></i>
                            </button>
                            <button
                              data-title="Step1"
                              data-intro="点击可锁定题目，锁定后不可删除"
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
                    </div>
                    <button
                      v-if="appState.txts.length !== 0"
                      data-title="Step1"
                      data-intro="点击可生成题目JSON"
                      type="button"
                      class="btn btn-primary"
                      @click="generateQuestionsJSON"
                    >
                      <i class="fas fa-file-signature fa-1x"></i> 生成JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="accordion-item" style="border-bottom-width: 0">
              <h2 class="accordion-header" id="Step2">
                <button
                  :class="`accordion-button accordion-button-${appState.webSiteConfig.appColor} collapsed fs-3 bg-${appState.webSiteConfig.appColor} text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#Step-2"
                  aria-expanded="false"
                  aria-controls="Step-2"
                >
                  Step 2
                </button>
              </h2>
              <div
                id="Step-2"
                :class="`accordion-collapse collapse show bg-${appState.webSiteConfig.appColor}`"
                aria-labelledby="Step2"
                data-bs-parent="#accordionFlushExample"
              >
                <div class="accordion-body">
                  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <p class="mb-0" :class="`text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`">
                      Step 1 点击「生成JSON」会按当前题目<strong>整份替换</strong>下方内容（不累加）；也可直接加载或合并本地 JSON 文件
                    </p>
                    <div>
                      <router-link class="btn btn-outline-secondary" to="/question-bank">
                        <i class="fas fa-book me-1"></i> 进入题库
                      </router-link>
                    </div>
                  </div>
                  <div class="row" style="margin-top: 12px">
                    <div class="d-flex">
                      <input
                        data-title="Step2"
                        data-intro="点击可将本地题目JSON添加到JSON内容中"
                        class="form-control"
                        type="file"
                        accept=".json,application/json"
                        @change="getFile"
                        multiple
                      />
                      <button
                        type="button"
                        class="btn btn-primary"
                        style="white-space:nowrap"
                        data-bs-toggle="modal"
                        data-bs-target="#saveLocalBankModal"
                        @click="openSaveExportModal"
                      >
                        <i class="fas fa-save me-1"></i> 保存/导出
                      </button>
                    </div>
                  </div>
                  <div class="row" style="margin-top: 12px">
                    <div class="col-12">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="fw-semibold mb-0">JSON 内容</span>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary json-doc-trigger"
                          data-bs-toggle="modal"
                          data-bs-target="#jsonVersionDocModal"
                          aria-label="查看 JSON 版本说明"
                          title="JSON 版本说明"
                        >
                          <i class="fas fa-question-circle"></i>
                        </button>
                      </div>
                      <div class="form-floating">
                        <button
                          data-title="Step2"
                          data-intro="点击可将JSON内容重置"
                          class="btn btn-danger position-absolute top-0 end-0"
                          @click="deleteQuestionsJSON"
                        >
                          <i class="far fa-trash-alt"></i>
                        </button>
                        <textarea
                          class="form-control shadow-sm bg-body rounded"
                          placeholder="_json_"
                          id="json"
                          style="min-height: 50em;resize:none"
                          :value="questionJSONShow()"
                          readonly
                        />
                        <label for="json">JSON 数据</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="accordion-item" style="border-bottom-width: 0">
              <h2 class="accordion-header" id="Step3">
                <button
                  :class="`accordion-button accordion-button-${appState.webSiteConfig.appColor} collapsed fs-3 bg-${appState.webSiteConfig.appColor} text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#Step-3"
                  aria-expanded="false"
                  aria-controls="Step-3"
                >
                  Step 3
                </button>
              </h2>
              <div
                id="Step-3"
                :class="`accordion-collapse collapse show bg-${appState.webSiteConfig.appColor}`"
                aria-labelledby="Step3"
                data-bs-parent="#accordionFlushExample"
              >
                <div class="accordion-body">
                  <div v-if="appState.questionsJSON.questions.length === 0" :class="`text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`">
                    目前没有题目哦！～ 请从前两步生成题目！
                  </div>
                  <div v-else>
                    <div :class="`d-flex bd-highlight text-${judgeColorChangeFontColor(appState.webSiteConfig.appColor)}`">
                      <div class="me-auto bd-highlight p-2">题目进度</div>
                      <div class="bd-highlight p-2">
                        {{ trueAnswerNumber(appState.questionsJSON.questions) }}/{{ allAnswerNumber(appState.questionsJSON.questions) }}
                      </div>
                    </div>
                    <div class="progress" style="margin-bottom:2rem">
                      <div
                        class="progress-bar bg-success progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        :style="`width: ${numberToPercent(trueAnswerNumber(appState.questionsJSON.questions), allAnswerNumber(appState.questionsJSON.questions))}%`"
                      ></div>
                      <div
                        class="progress-bar bg-danger"
                        role="progressbar"
                        :style="`width: ${numberToPercent(allAnswerNumber(appState.questionsJSON.questions) - trueAnswerNumber(appState.questionsJSON.questions), allAnswerNumber(appState.questionsJSON.questions))}%`"
                      ></div>
                    </div>
                    <AppQuestion :data="appState.questionsJSON" :appcolor="appState.webSiteConfig.appColor" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="position: fixed; bottom: 12px; right: 12px; z-index: 1">
      <button type="button" class="btn btn-secondary" @click="intro"><i class="fas fa-question"></i></button>
    </div>

    <div class="modal fade" id="saveLocalBankModal" tabindex="-1" aria-labelledby="saveLocalBankModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="saveLocalBankModalLabel">保存到本地题库</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">保存目标</label>
              <div class="d-flex flex-wrap gap-3">
                <div class="form-check">
                  <input id="save-target-browser" v-model="saveTargets" class="form-check-input" type="checkbox" value="browser" />
                  <label class="form-check-label" for="save-target-browser">
                    <i class="fas fa-globe me-1"></i>保存到浏览器
                  </label>
                </div>
                <div class="form-check">
                  <input id="save-target-file" v-model="saveTargets" class="form-check-input" type="checkbox" value="file" />
                  <label class="form-check-label" for="save-target-file">
                    <i class="fas fa-file-export me-1"></i>保存到文件
                  </label>
                </div>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label">题集名称</label>
              <input v-model="localBankDraft.title" class="form-control" placeholder="例如：高一数学-函数" @input="syncExportFileNameFromDraft" />
            </div>
            <div class="mb-2">
              <label class="form-label">类型</label>
              <input v-model="localBankDraft.subject" class="form-control" placeholder="例如：数学" @input="syncExportFileNameFromDraft" />
            </div>
            <div>
              <label class="form-label">作者</label>
              <input v-model="localBankDraft.author" class="form-control" placeholder="例如：RedCrazyGhost" @input="syncExportFileNameFromDraft" />
            </div>
            <div class="mt-2" v-if="saveTargets.includes('file')">
              <label class="form-label">导出文件名（可修改）</label>
              <input v-model="exportFileName" class="form-control" placeholder="例如：题集名称-类别-作者-20260425.json" />
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

    <div class="modal fade" id="jsonVersionDocModal" tabindex="-1" aria-labelledby="jsonVersionDocModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="jsonVersionDocModalLabel">JSON 版本说明（字段级模型）</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              当前系统内部统一按 <code>0.0.2</code> 处理，导出统一写出 <code>0.0.2</code>。导入旧版
              <code>0.0.1</code> 时会自动补齐缺失元数据字段。
            </p>
            <div class="table-responsive">
              <table class="table table-sm align-middle json-doc-table">
                <thead>
                  <tr>
                    <th>版本</th>
                    <th>字段</th>
                    <th>类型</th>
                    <th>必填</th>
                    <th>说明</th>
                    <th>兼容性</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="json-version-group-head json-version-002-head">
                    <td colspan="6"><strong>0.0.2 数据模型</strong></td>
                  </tr>
                  <tr class="json-version-002-row">
                    <td><span class="badge text-bg-primary">0.0.2</span></td>
                    <td><code>version</code></td>
                    <td>string</td>
                    <td>是</td>
                    <td>当前标准版本字段</td>
                    <td>导入与导出均按该版本对齐</td>
                  </tr>
                  <tr class="json-version-002-row">
                    <td><span class="badge text-bg-primary">0.0.2</span></td>
                    <td><code>name</code></td>
                    <td>string</td>
                    <td>建议</td>
                    <td>题集名称（用于展示与导出命名）</td>
                    <td>缺失可导入，导出前建议补齐</td>
                  </tr>
                  <tr class="json-version-002-row">
                    <td><span class="badge text-bg-primary">0.0.2</span></td>
                    <td><code>type</code></td>
                    <td>string</td>
                    <td>建议</td>
                    <td>题集类型</td>
                    <td>缺失可导入，导出前建议补齐</td>
                  </tr>
                  <tr class="json-version-002-row">
                    <td><span class="badge text-bg-primary">0.0.2</span></td>
                    <td><code>author</code></td>
                    <td>string</td>
                    <td>建议</td>
                    <td>题集作者</td>
                    <td>缺失可导入，导出前建议补齐</td>
                  </tr>
                  <tr class="json-version-002-row">
                    <td><span class="badge text-bg-primary">0.0.2</span></td>
                    <td><code>questions</code></td>
                    <td>array</td>
                    <td>是</td>
                    <td>题目数组（与旧版核心结构兼容）</td>
                    <td>向后兼容 <code>0.0.1</code> 的题目内容</td>
                  </tr>
                  <tr class="json-version-group-head json-version-001-head">
                    <td colspan="6"><strong>0.0.1 数据模型</strong></td>
                  </tr>
                  <tr class="json-version-001-row">
                    <td><span class="badge text-bg-secondary">0.0.1</span></td>
                    <td><code>version</code></td>
                    <td>string</td>
                    <td>是</td>
                    <td>JSON 结构版本标识</td>
                    <td>导入时自动识别并归一化到 <code>0.0.2</code> 处理流程</td>
                  </tr>
                  <tr class="json-version-001-row">
                    <td><span class="badge text-bg-secondary">0.0.1</span></td>
                    <td><code>questions</code></td>
                    <td>array</td>
                    <td>是</td>
                    <td>题目数组（核心数据）</td>
                    <td>完全兼容，原样保留</td>
                  </tr>
                  <tr class="json-version-001-row">
                    <td><span class="badge text-bg-secondary">0.0.1</span></td>
                    <td><code>name/type/author</code></td>
                    <td>string</td>
                    <td>否</td>
                    <td>旧版通常缺失元数据</td>
                    <td>缺失时自动补空字符串</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.json-doc-trigger {
  line-height: 1;
}

.json-doc-table th,
.json-doc-table td {
  vertical-align: middle;
}

.json-version-group-head td {
  font-size: 0.9rem;
  border-top-width: 2px;
}

.json-version-001-head td {
  background-color: rgba(108, 117, 125, 0.16);
}

.json-version-002-head td {
  background-color: rgba(13, 110, 253, 0.16);
}

.json-version-001-row td {
  background-color: rgba(108, 117, 125, 0.06);
}

.json-version-002-row td {
  background-color: rgba(13, 110, 253, 0.06);
}
</style>
