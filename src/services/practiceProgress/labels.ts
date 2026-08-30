import { getTimeYYYYMMDD } from "../../utils/time";
import {
  isRecord,
  NotebookKind,
  PracticeMode,
  type BankSource,
  type EnrichedNotebook,
  type InvalidReason,
  type NotebookKind,
  type PracticeNotebook
} from "./types";
import { normalizeNotebook, readStore, writeStore } from "./store";

function formatNotebookDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeYYYYMMDD(date);
}

export function getNotebookKindLabel(kind: NotebookKind | string | undefined): string {
  switch (kind) {
    case NotebookKind.WRONG:
      return "错题本";
    case NotebookKind.PRACTICE:
    default:
      return "做题本";
  }
}

export function formatNotebookChainLabel(notebook: EnrichedNotebook | PracticeNotebook): string {
  const kindLabel = getNotebookKindLabel(notebook.kind);
  const dateSource =
    notebook.kind === NotebookKind.WRONG
      ? notebook.createdAt
      : notebook.updatedAt || notebook.createdAt;
  const dateText = formatNotebookDate(dateSource);
  const base = dateText ? `${kindLabel} ${dateText}` : kindLabel;

  if (notebook.kind === NotebookKind.PRACTICE && notebook.checkpoint?.stats) {
    const attempted = notebook.checkpoint.stats.attemptedSlots ?? 0;
    const total = notebook.checkpoint.stats.totalSlots ?? 0;
    if (total > 0) {
      return `${base} · 进度 ${attempted}/${total}`;
    }
  }

  return base;
}

export function getInvalidReasonLabel(reason: InvalidReason | string | undefined): string {
  switch (reason) {
    case "bankMissing":
      return "原题库已不存在";
    case "questionCountMismatch":
      return "题库题目数量已变更";
    case "sessionQuestionsMissing":
      return "题目快照缺失";
    default:
      return "记录已失效";
  }
}

export function getBankSourceLabel(source: BankSource | string | undefined): string {
  switch (source) {
    case "local":
      return "本地题库";
    case "remote":
      return "远程题库";
    case "session":
      return "首页会话";
    default:
      return "未知来源";
  }
}

export function getPracticeModeLabel(mode: string | undefined | null): string {
  switch (mode) {
    case PracticeMode.WRONG:
      return "错题本";
    case PracticeMode.RESUME:
    default:
      return "做题本";
  }
}

/** 导出当前练习档案 store（含 schemaVersion + notebooks） */
export function exportPracticeProgressStore(): string {
  return JSON.stringify(readStore(), null, 2);
}

export type ImportPracticeProgressResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 用备份 JSON 整体替换练习档案。校验失败时不改动现有数据。
 */
export function importPracticeProgressStore(payload: string): ImportPracticeProgressResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ok: false, message: "备份文件不是有效的 JSON。" };
  }
  if (!isRecord(parsed) || !isRecord(parsed.notebooks)) {
    return { ok: false, message: "备份文件缺少 notebooks 字段，无法导入。" };
  }

  const notebooks: Record<string, PracticeNotebook> = {};
  for (const [id, value] of Object.entries(parsed.notebooks)) {
    if (!isRecord(value)) {
      return { ok: false, message: "备份文件中的做题本数据格式无效。" };
    }
    const notebook = normalizeNotebook({ ...value, id: value.id ?? id }, id);
    if (!notebook) {
      return { ok: false, message: "备份文件中存在无法识别的做题本。" };
    }
    notebooks[notebook.id] = notebook;
  }

  writeStore(notebooks);
  return { ok: true };
}
