import type { Question, QuestionType } from "../models/question/types";

const QUESTION_TYPE_LABELS: Record<QuestionType | "subjective", string> = {
  fillBlank: "填空题",
  singleChoice: "单选题",
  multipleChoice: "多选题",
  judgment: "判断题",
  subjective: "主观题"
};

function getQuestionType(question: Question | null | undefined): QuestionType | "subjective" {
  return question?.questionType ?? "fillBlank";
}

function getQuestionTypeLabel(type: QuestionType | "subjective"): string {
  return QUESTION_TYPE_LABELS[type] ?? QUESTION_TYPE_LABELS.fillBlank;
}

export const QUESTION_REPORT_TYPES = [
  { id: "content", label: "题目内容有误" },
  { id: "answer", label: "答案不正确" },
  { id: "explanation", label: "解析有误" },
  { id: "other", label: "其他" }
] as const;

export type QuestionReportTypeId = (typeof QUESTION_REPORT_TYPES)[number]["id"];

const MAX_PREVIEW_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

const REPORT_TYPE_LABELS = new Map<string, string>(
  QUESTION_REPORT_TYPES.map((item) => [item.id, item.label])
);

export function formatQuestionPreview(question: Question | null | undefined): string {
  let text = "";
  if (question && "stem" in question && question.stem) {
    text = String(question.stem);
  } else if (question && "texts" in question && Array.isArray(question.texts)) {
    text = question.texts.filter(Boolean).join(" ");
  }
  text = text.trim();
  if (!text) return "-";
  if (text.length <= MAX_PREVIEW_LENGTH) return text;
  return `${text.slice(0, MAX_PREVIEW_LENGTH)}…`;
}

function formatReportTypeLabels(reportTypes: string[]): string {
  return reportTypes.map((id) => REPORT_TYPE_LABELS.get(id) || id).join(" / ");
}

function formatAnswers(question: Question | null | undefined): string {
  if (question?.MD5) {
    return "答案已加密，请对照原题集";
  }
  if (!Array.isArray(question?.answers)) return "-";
  return question.answers
    .map((slot, index) => `第${index + 1}空: ${(slot || []).join(" / ") || "-"}`)
    .join("\n");
}

function truncateText(text: string | null | undefined, maxLength = 500): string {
  const value = String(text ?? "").trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

function sanitizeQuestionForExport(question: Question): Question {
  if (!question?.MD5) return question;
  return {
    ...question,
    answers: question.answers?.map(() => ["[encrypted]"]) ?? []
  };
}

function buildQuestionJsonBlock(question: Question, includeJson: boolean): string {
  if (!includeJson) {
    return "（内容过长已省略，完整 JSON 请在本地导出题集后附上）";
  }
  return [
    "```json",
    JSON.stringify(sanitizeQuestionForExport(question), null, 2),
    "```"
  ].join("\n");
}

export interface QuestionReportBankInfo {
  name?: string;
  type?: string;
  author?: string;
  bankId?: string;
  bankSource?: string;
  version?: string;
}

export interface BuildQuestionReportIssueParams {
  bank: QuestionReportBankInfo;
  question: Question;
  qindex: number;
  reportTypes: string[];
  userNote: string;
  appVersion: string;
}

interface BuildBaseSectionsParams extends BuildQuestionReportIssueParams {
  explanationLimit: number;
  userNoteLimit: number;
}

function buildBaseSections({
  bank,
  question,
  qindex,
  reportTypes,
  userNote,
  appVersion,
  explanationLimit,
  userNoteLimit
}: BuildBaseSectionsParams): string[] {
  const explanation = truncateText(question?.explanation, explanationLimit) || "（无）";
  const note = truncateText(userNote, userNoteLimit) || "（无）";

  return [
    "## 反馈类型",
    formatReportTypeLabels(reportTypes),
    "",
    "## 题集信息",
    `- 名称: ${bank?.name || "-"}`,
    `- 类型: ${bank?.type || "-"}`,
    `- 作者: ${bank?.author || "-"}`,
    `- bankId: ${bank?.bankId || "-"}`,
    `- 来源: ${bank?.bankSource || "-"}`,
    `- QuestionJSON 版本: ${bank?.version || "-"}`,
    "",
    "## 题目信息",
    `- 题号: 第 ${qindex + 1} 题`,
    `- 题型: ${getQuestionTypeLabel(getQuestionType(question))}`,
    `- 题干摘要: ${formatQuestionPreview(question)}`,
    "",
    "## 标准答案",
    formatAnswers(question),
    "",
    "## 解析",
    explanation,
    "",
    "## 补充说明",
    note,
    "",
    "## 环境",
    `- 网站版本: ${appVersion || "-"}`,
    "",
    "## 题目 JSON"
  ];
}

export function buildQuestionReportIssue({
  bank,
  question,
  qindex,
  reportTypes,
  userNote,
  appVersion
}: BuildQuestionReportIssueParams): { title: string; body: string } {
  const bankName = bank?.name || "未命名题集";
  const typeLabels = formatReportTypeLabels(reportTypes);
  const title = `[题目反馈] ${bankName} - 第${qindex + 1}题 - ${typeLabels}`;

  let explanationLimit = 500;
  let userNoteLimit = 500;
  let includeJson = true;
  let body = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const baseSections = buildBaseSections({
      bank,
      question,
      qindex,
      reportTypes,
      userNote,
      appVersion,
      explanationLimit,
      userNoteLimit
    });
    body = `${baseSections.join("\n")}\n${buildQuestionJsonBlock(question, includeJson)}`;
    if (body.length <= MAX_BODY_LENGTH) break;
    if (includeJson) {
      includeJson = false;
      continue;
    }
    explanationLimit = Math.max(120, Math.floor(explanationLimit / 2));
    userNoteLimit = Math.max(120, Math.floor(userNoteLimit / 2));
  }

  return { title, body };
}

export interface BuildQuestionReportIssueUrlParams extends BuildQuestionReportIssueParams {
  owner: string;
  repo: string;
}

export function buildQuestionReportIssueUrl({
  owner,
  repo,
  bank,
  question,
  qindex,
  reportTypes,
  userNote,
  appVersion
}: BuildQuestionReportIssueUrlParams): string {
  const { title, body } = buildQuestionReportIssue({
    bank,
    question,
    qindex,
    reportTypes,
    userNote,
    appVersion
  });
  const params = new URLSearchParams();
  params.set("title", title);
  params.set("body", body);
  params.set("labels", "question-report");
  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
}
