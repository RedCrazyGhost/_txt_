const TXT_FORMAT_RULES = `
_txt_ 题目格式规则：

## 填空题
- 用下划线包裹答案，例如 1+1=_2_ 或 水的化学式是_H2O_。
- 支持多空：在C语言中，& 表示_取地址运算符_，双目表示_按位与运算符_。
- 等价答案用逗号分隔：x^2-1=0 的解为 _1,-1_。
- 答案必须写在 _ 内，不要留空 _ _。

## 单选题
- 题干与选项合并在 txt 一个字符串中。
- 答案位置只写 A-D 单字母，可逗号分隔大小写：_b,B_ 或 _C_。
- 每题仅一个答案槽（单选不能多空）。
- 选项必须以换行 + A./B./C./D. 格式列出，至少 2 项，建议 4 项。例如：
下面正确的字符常量是_c,C_。
A. "c"
B. "\\\\"
C. 'W'
D. ''

## 通用约束
- 每道题 txt 必须非空，下划线总数必须为偶数，且至少包含一对 _答案_。
- JSON 字符串内的引号与反斜杠需正确转义。
- 只输出 JSON 对象，不要包裹 Markdown 代码块。

## 常见错误（勿犯）
- 单选题答案写成完整文字（如 _operating system_）而非 A-D 字母，会导致无法识别为单选。
- 选项缺少 \\nA. 前缀，或选项与题干分在不同字段。
- 下划线数量为奇数，或完全没有 _答案_ 包裹。
`.trim();

const GENERATION_PRINCIPLES = `
生成原则：
- 数量：严格按用户要求的题数；未指定时默认 5 道。
- 难度：简单/中等/困难对应考查深度；单选题干扰项应基于常见误区，避免一眼假。
- 单选题：4 选项为宜；填空题答案应简洁准确。
- 解析：explanation 写 1-3 句，说明依据而非重复答案；answer 与 _ 内答案一致。
- 元信息：从用户描述推断 name/type；author 默认填 AI。
`.trim();

const FEW_SHOT_EXAMPLES = `
完整输出示例（仅供格式参考，实际题数与内容按用户要求）：

示例 1 — 填空题：
{"name":"基础算术","type":"数学","author":"AI","questions":[{"txt":"1+1=_2_","answer":"2","explanation":"1 加 1 等于 2，属于基础加法。"}]}

示例 2 — 单选题：
{"name":"C语言基础","type":"C语言","author":"AI","questions":[{"txt":"下面正确的字符常量是_c,C_。\\nA. \\"c\\"\\nB. \\"\\\\\\\\\\"\\nC. 'W'\\nD. ''","answer":"C","explanation":"字符常量用单引号包裹单个字符，'W' 是合法字符常量；A 是字符串，B 是转义字符，D 为空字符常量。"}]}
`.trim();

export function buildSystemPrompt() {
  return `你是 _txt_ 题集生成助手。请根据用户要求生成填空题和/或单选题，严格使用 _txt_ 文本格式。

${TXT_FORMAT_RULES}

输出必须是合法 JSON，结构如下：
{
  "name": "题集名称",
  "type": "学科或分类",
  "author": "作者，可填 AI",
  "questions": [
    {
      "txt": "题目文本（含 _答案_）",
      "answer": "答案要点（如 B 或 2）",
      "explanation": "解析说明，简要解释为什么是这个答案"
    }
  ]
}

每道题必须同时提供 txt、answer、explanation。txt 写入题集文本，answer 用于对话展示，explanation 写入题集解析字段。

${GENERATION_PRINCIPLES}

${FEW_SHOT_EXAMPLES}`;
}

function buildExecutionInstructions(hasReferences) {
  const lines = [
    "【执行说明】",
    "- 题数：从生成要求中提取，未说明则 5 道",
    "- 题型：按用户指定；未指定则混合填空与单选"
  ];

  if (hasReferences) {
    lines.push("- 有参考内容时：考点与表述以参考为准，不编造参考未提及的事实");
  }

  lines.push("- 输出前自检：每题 txt 含成对 _；单选答案为 A-D 字母；JSON 可解析");

  return lines.join("\n");
}

export function buildUserPrompt(prompt, references = []) {
  const trimmed = String(prompt ?? "").trim();
  const refList = Array.isArray(references) ? references : [];
  const hasReferences = refList.length > 0;

  const refBlock = hasReferences
    ? refList
        .map((file, index) => `--- 参考 ${index + 1}：${file.name} ---\n${file.content}`)
        .join("\n\n")
    : "";

  const parts = ["【生成要求】", trimmed];

  if (refBlock) {
    parts.push("", "【参考内容】", refBlock);
  }

  parts.push("", buildExecutionInstructions(hasReferences));

  return parts.join("\n");
}

const TUTOR_PRINCIPLES = `
辅导原则：
- 围绕当前题目作答，引导用户思考，避免一上来直接给出完整标准答案（除非用户已答对、或明确要求直接告知答案）。
- 结合用户已填写的 results 指出对错与思路，帮助理解考点。
- 回答简洁清晰，必要时用分步说明；使用中文回复。
- 不要生成新题目，不要偏离当前题目讨论无关内容。
`.trim();

export function buildQuestionTutorSystemPrompt() {
  return `你是 _txt_ 本题答疑助手。用户正在练习一道题，你需要基于下方题目数据协助理解与纠错。

${TUTOR_PRINCIPLES}`;
}

function hasQuestionImage(image) {
  return typeof image === "string" && image.trim() !== "";
}

export function serializeQuestionForTutor(question) {
  if (!question || typeof question !== "object") {
    return "{}";
  }

  const isMd5 = Boolean(question.MD5);
  const payload = {};

  if (question.questionType) {
    payload.questionType = question.questionType;
  }
  if (typeof question.stem === "string" && question.stem.trim()) {
    payload.stem = question.stem;
  }
  if (Array.isArray(question.texts)) {
    payload.texts = question.texts;
  }
  if (Array.isArray(question.options)) {
    payload.options = question.options.map((option) => ({
      key: String(option?.key ?? ""),
      text: String(option?.text ?? "")
    }));
  }
  if (Array.isArray(question.results)) {
    payload.results = question.results.map((value) =>
      value === undefined || value === null ? null : String(value)
    );
  }
  if (hasQuestionImage(question.image)) {
    payload.hasImage = true;
  }

  payload.MD5 = isMd5;

  if (!isMd5) {
    if (Array.isArray(question.answers)) {
      payload.answers = question.answers;
    }
    if (typeof question.explanation === "string" && question.explanation.trim()) {
      payload.explanation = question.explanation;
    }
  }

  return JSON.stringify(payload, null, 2);
}

export function buildQuestionTutorMessages({ question, history = [], userText }) {
  const systemContent = `${buildQuestionTutorSystemPrompt()}

【本题数据】
${serializeQuestionForTutor(question)}`;

  const messages = [{ role: "system", content: systemContent }];

  const validHistory = (Array.isArray(history) ? history : []).filter(
    (entry) =>
      entry &&
      (entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string" &&
      entry.content.trim()
  );

  for (const entry of validHistory) {
    messages.push({ role: entry.role, content: entry.content });
  }

  const trimmedUserText = String(userText ?? "").trim();
  if (trimmedUserText) {
    messages.push({ role: "user", content: trimmedUserText });
  }

  return messages;
}
