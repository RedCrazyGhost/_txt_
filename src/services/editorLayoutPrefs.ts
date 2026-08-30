export const EDITOR_LAYOUT_STORAGE_KEY = "_txt_editor_layout";

export type EditorPaneId = "list" | "preview" | "edit";
export type EditorRightTab = "edit" | "ai";
export type EditorCenterView = "question" | "json";
export type EditorDistribution = "columns" | "leftStack";

export type EditorPaneOrder = [EditorPaneId, EditorPaneId, EditorPaneId];

export interface EditorPaneWidths {
  left: number;
  right: number;
}

export interface EditorPaneHeights {
  top: number;
}

export interface EditorLayoutPrefs {
  order: EditorPaneOrder;
  widths: EditorPaneWidths;
  heights: EditorPaneHeights;
  distribution: EditorDistribution;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  rightTab: EditorRightTab;
  centerView: EditorCenterView;
  userTouchedLeft: boolean;
  userTouchedRight: boolean;
}

export interface EditorLayoutPreset {
  id: string;
  label: string;
  order: EditorPaneOrder;
}

export const EDITOR_RAIL_WIDTH_PX = 44;
export const EDITOR_SPLIT_WIDTH_PX = 6;
export const EDITOR_SIDE_MIN_PX = 160;
export const EDITOR_SIDE_MAX_PX = 480;
export const EDITOR_CENTER_MIN_PX = 280;
export const EDITOR_COLLAPSE_THRESHOLD_PX = 120;
export const EDITOR_STACK_MIN_PX = 120;
export const EDITOR_STACK_DEFAULT_TOP_PX = 280;

export const DEFAULT_EDITOR_WIDTHS: EditorPaneWidths = {
  left: 248,
  right: 352
};

export const DEFAULT_EDITOR_HEIGHTS: EditorPaneHeights = {
  top: EDITOR_STACK_DEFAULT_TOP_PX
};

export const DEFAULT_EDITOR_LAYOUT: EditorLayoutPrefs = {
  order: ["list", "preview", "edit"],
  widths: { ...DEFAULT_EDITOR_WIDTHS },
  heights: { ...DEFAULT_EDITOR_HEIGHTS },
  distribution: "columns",
  leftCollapsed: false,
  rightCollapsed: false,
  rightTab: "edit",
  centerView: "question",
  userTouchedLeft: false,
  userTouchedRight: false
};

export const EDITOR_LAYOUT_PRESETS: EditorLayoutPreset[] = [
  { id: "list-preview-edit", label: "列表 | 预览 | 编辑", order: ["list", "preview", "edit"] },
  { id: "list-edit-preview", label: "列表 | 编辑 | 预览", order: ["list", "edit", "preview"] },
  { id: "preview-list-edit", label: "预览 | 列表 | 编辑", order: ["preview", "list", "edit"] },
  { id: "preview-edit-list", label: "预览 | 编辑 | 列表", order: ["preview", "edit", "list"] },
  { id: "edit-list-preview", label: "编辑 | 列表 | 预览", order: ["edit", "list", "preview"] },
  { id: "edit-preview-list", label: "编辑 | 预览 | 列表", order: ["edit", "preview", "list"] }
];

const PANE_IDS: EditorPaneId[] = ["list", "preview", "edit"];

function isPaneId(value: unknown): value is EditorPaneId {
  return value === "list" || value === "preview" || value === "edit";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeOrder(raw: unknown): EditorPaneOrder {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return [...DEFAULT_EDITOR_LAYOUT.order];
  }
  const next = raw.filter(isPaneId);
  if (next.length !== 3) return [...DEFAULT_EDITOR_LAYOUT.order];
  if (new Set(next).size !== 3) return [...DEFAULT_EDITOR_LAYOUT.order];
  if (!PANE_IDS.every((id) => next.includes(id))) {
    return [...DEFAULT_EDITOR_LAYOUT.order];
  }
  return [next[0], next[1], next[2]];
}

function normalizeDistribution(raw: unknown): EditorDistribution {
  return raw === "leftStack" ? "leftStack" : "columns";
}

export function normalizeWidths(
  raw: unknown,
  containerWidth?: number
): EditorPaneWidths {
  const source =
    raw && typeof raw === "object"
      ? (raw as Partial<EditorPaneWidths>)
      : DEFAULT_EDITOR_WIDTHS;
  let left = Number(source.left);
  let right = Number(source.right);
  if (!Number.isFinite(left)) left = DEFAULT_EDITOR_WIDTHS.left;
  if (!Number.isFinite(right)) right = DEFAULT_EDITOR_WIDTHS.right;

  left = clamp(left, EDITOR_SIDE_MIN_PX, EDITOR_SIDE_MAX_PX);
  right = clamp(right, EDITOR_SIDE_MIN_PX, EDITOR_SIDE_MAX_PX);

  if (typeof containerWidth === "number" && Number.isFinite(containerWidth) && containerWidth > 0) {
    const overhead = EDITOR_SPLIT_WIDTH_PX * 2;
    const maxSideTotal = Math.max(
      EDITOR_SIDE_MIN_PX * 2,
      containerWidth - overhead - EDITOR_CENTER_MIN_PX
    );
    if (left + right > maxSideTotal) {
      const scale = maxSideTotal / (left + right);
      left = clamp(Math.floor(left * scale), EDITOR_SIDE_MIN_PX, EDITOR_SIDE_MAX_PX);
      right = clamp(Math.floor(right * scale), EDITOR_SIDE_MIN_PX, EDITOR_SIDE_MAX_PX);
      if (left + right > maxSideTotal) {
        right = Math.max(EDITOR_SIDE_MIN_PX, maxSideTotal - left);
      }
    }
  }

  return { left, right };
}

/** Clamp during drag; allows widths below SIDE_MIN so collapse threshold can be reached. */
export function clampDragSideWidth(width: number, containerWidth?: number, otherSide = 0): number {
  let next = Number(width);
  if (!Number.isFinite(next)) next = DEFAULT_EDITOR_WIDTHS.left;
  next = clamp(next, EDITOR_RAIL_WIDTH_PX, EDITOR_SIDE_MAX_PX);

  if (typeof containerWidth === "number" && Number.isFinite(containerWidth) && containerWidth > 0) {
    const overhead = EDITOR_SPLIT_WIDTH_PX * 2;
    const maxForSide = Math.max(
      EDITOR_RAIL_WIDTH_PX,
      containerWidth - overhead - EDITOR_CENTER_MIN_PX - Math.max(otherSide, EDITOR_SIDE_MIN_PX)
    );
    next = Math.min(next, maxForSide);
  }

  return next;
}

export function normalizeHeights(raw: unknown, containerHeight?: number): EditorPaneHeights {
  const source =
    raw && typeof raw === "object"
      ? (raw as Partial<EditorPaneHeights>)
      : DEFAULT_EDITOR_HEIGHTS;
  let top = Number(source.top);
  if (!Number.isFinite(top)) top = DEFAULT_EDITOR_HEIGHTS.top;

  if (typeof containerHeight === "number" && Number.isFinite(containerHeight) && containerHeight > 0) {
    const maxTop = Math.max(
      EDITOR_STACK_MIN_PX,
      containerHeight - EDITOR_SPLIT_WIDTH_PX - EDITOR_STACK_MIN_PX
    );
    top = clamp(top, EDITOR_STACK_MIN_PX, maxTop);
  } else {
    top = clamp(top, EDITOR_STACK_MIN_PX, 2000);
  }

  return { top };
}

export function cloneLayoutPrefs(prefs: EditorLayoutPrefs): EditorLayoutPrefs {
  return {
    ...prefs,
    order: [...prefs.order] as EditorPaneOrder,
    widths: { ...prefs.widths },
    heights: { ...prefs.heights }
  };
}

export function loadEditorLayoutPrefs(): EditorLayoutPrefs {
  if (typeof window === "undefined") {
    return cloneLayoutPrefs(DEFAULT_EDITOR_LAYOUT);
  }
  try {
    const raw = window.localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return cloneLayoutPrefs(DEFAULT_EDITOR_LAYOUT);
    }
    const parsed = JSON.parse(raw) as Partial<EditorLayoutPrefs>;
    return {
      order: normalizeOrder(parsed.order),
      widths: normalizeWidths(parsed.widths),
      heights: normalizeHeights(parsed.heights),
      distribution: normalizeDistribution(parsed.distribution),
      leftCollapsed: Boolean(parsed.leftCollapsed),
      rightCollapsed: Boolean(parsed.rightCollapsed),
      rightTab: parsed.rightTab === "ai" ? "ai" : "edit",
      centerView: parsed.centerView === "json" ? "json" : "question",
      userTouchedLeft: Boolean(parsed.userTouchedLeft),
      userTouchedRight: Boolean(parsed.userTouchedRight)
    };
  } catch {
    return cloneLayoutPrefs(DEFAULT_EDITOR_LAYOUT);
  }
}

export function saveEditorLayoutPrefs(prefs: EditorLayoutPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      EDITOR_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        ...prefs,
        order: normalizeOrder(prefs.order),
        widths: normalizeWidths(prefs.widths),
        heights: normalizeHeights(prefs.heights),
        distribution: normalizeDistribution(prefs.distribution)
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function orderToPresetId(order: EditorPaneOrder): string {
  const key = order.join("-");
  return EDITOR_LAYOUT_PRESETS.find((item) => item.order.join("-") === key)?.id ?? "custom";
}

export function paneLabel(id: EditorPaneId): string {
  if (id === "list") return "列表";
  if (id === "preview") return "预览";
  return "编辑";
}

export function swapPaneOrder(
  order: EditorPaneOrder,
  from: EditorPaneId,
  to: EditorPaneId
): EditorPaneOrder {
  if (from === to) return [...order] as EditorPaneOrder;
  const next = [...order] as EditorPaneId[];
  const i = next.indexOf(from);
  const j = next.indexOf(to);
  if (i < 0 || j < 0) return [...order] as EditorPaneOrder;
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return [next[0], next[1], next[2]];
}
