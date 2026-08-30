<script setup lang="ts">
</script>

<template>
  <div
    class="modal fade"
    id="jsonVersionDocModal"
    tabindex="-1"
    aria-labelledby="jsonVersionDocModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="jsonVersionDocModalLabel">JSON 版本说明（字段级模型）</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p class="small text-muted mb-3">
            纯填空题集导入/导出使用 <code>0.0.2</code>；含 <code>questionType</code> 或单选题结构化字段时导出
            <code>0.0.3</code>。导入 <code>0.0.1</code> / <code>0.0.2</code> / <code>0.0.3</code> 均可。练习时：题干含
            A/B/C/D 且答案为字母的 <code>0.0.2</code> 题会自动识别为单选题 UI；纯填空题仍用填空样式。JSON 文件本身无需修改。
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
                <tr class="json-version-group-head json-version-003-head">
                  <td colspan="6"><strong>0.0.3 题目扩展字段</strong></td>
                </tr>
                <tr class="json-version-003-row">
                  <td><span class="badge text-bg-success">0.0.3</span></td>
                  <td><code>version</code></td>
                  <td>string</td>
                  <td>是</td>
                  <td>含多题型字段时使用 <code>0.0.3</code></td>
                  <td>纯填空题集仍可导出为 <code>0.0.2</code></td>
                </tr>
                <tr class="json-version-003-row">
                  <td><span class="badge text-bg-success">0.0.3</span></td>
                  <td><code>questionType</code></td>
                  <td>string</td>
                  <td>否</td>
                  <td>题目类型：<code>fillBlank</code>（默认）、<code>singleChoice</code> 等</td>
                  <td>省略时视为填空题</td>
                </tr>
                <tr class="json-version-003-row">
                  <td><span class="badge text-bg-success">0.0.3</span></td>
                  <td><code>explanation</code></td>
                  <td>string</td>
                  <td>否</td>
                  <td>题目解析（可选）</td>
                  <td>本版预留字段</td>
                </tr>
                <tr class="json-version-003-row">
                  <td><span class="badge text-bg-success">0.0.3</span></td>
                  <td><code>stem</code></td>
                  <td>string</td>
                  <td>单选建议</td>
                  <td>单选题题干</td>
                  <td>与 <code>texts</code> 二选一，按 <code>questionType</code> 使用</td>
                </tr>
                <tr class="json-version-003-row">
                  <td><span class="badge text-bg-success">0.0.3</span></td>
                  <td><code>options</code></td>
                  <td>array</td>
                  <td>单选建议</td>
                  <td>选项列表，元素为 <code>{ key, text }</code></td>
                  <td>仅 <code>singleChoice</code> 使用</td>
                </tr>
                <tr class="json-version-group-head json-version-002-head">
                  <td colspan="6"><strong>0.0.2 数据模型（填空题）</strong></td>
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
                <tr class="json-version-002-row">
                  <td><span class="badge text-bg-primary">0.0.2</span></td>
                  <td><code>texts/answers/answerslength</code></td>
                  <td>array</td>
                  <td>填空建议</td>
                  <td>填空题题干片段、答案与输入框宽度</td>
                  <td><code>0.0.3</code> 填空题仍使用这组字段</td>
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
</template>

<style scoped>
.json-doc-table th,
.json-doc-table td {
  vertical-align: middle;
}

.json-version-group-head td {
  font-size: 0.9rem;
  border-top-width: 2px;
}

.json-version-003-head td {
  background-color: rgba(25, 135, 84, 0.16);
}

.json-version-003-row td {
  background-color: rgba(25, 135, 84, 0.06);
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

:global([data-bs-theme="dark"]) .json-version-003-head td {
  background-color: rgba(25, 135, 84, 0.2);
}

:global([data-bs-theme="dark"]) .json-version-003-row td {
  background-color: rgba(25, 135, 84, 0.08);
}

:global([data-bs-theme="dark"]) .json-version-001-head td {
  background-color: rgba(148, 163, 184, 0.18);
}

:global([data-bs-theme="dark"]) .json-version-002-head td {
  background-color: rgba(96, 165, 250, 0.18);
}

:global([data-bs-theme="dark"]) .json-version-001-row td {
  background-color: rgba(148, 163, 184, 0.08);
}

:global([data-bs-theme="dark"]) .json-version-002-row td {
  background-color: rgba(96, 165, 250, 0.08);
}
</style>
