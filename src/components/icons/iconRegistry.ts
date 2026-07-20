/**
 * 将语义化图标名映射到当前项目已引入的 Font Awesome webfont class。
 * Step1 AI 面板等处通过 AppIcon 使用；其余页面仍可直接写 fas/fab class。
 */

export type AppIconName =
  | "arrow-up"
  | "atom"
  | "brain"
  | "comment-dots"
  | "compress"
  | "expand"
  | "file-lines"
  | "paperclip"
  | "times"
  | "wallet"
  | "wand-magic-sparkles"
  | (string & {});

const FALLBACK = "smile";

/** 规范化 name（允许 "fa-book" / "fas fa-book" / "book"），返回 webfont class 列表。 */
export function resolveIconClass(name: AppIconName | string): string[] {
  const raw = String(name ?? "").trim();
  if (!raw) return ["fas", `fa-${FALLBACK}`];

  // 已是完整 class：fas fa-book / fab fa-github
  if (/^fa[sbr]\s+fa-[\w-]+$/i.test(raw)) {
    return raw.split(/\s+/).filter(Boolean);
  }

  const slug = raw.replace(/^fa-/i, "") || FALLBACK;
  return ["fas", `fa-${slug}`];
}
