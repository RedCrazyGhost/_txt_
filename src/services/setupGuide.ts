/** 配置引导步骤注册表：新增需引导的配置时在此追加一项（id 唯一）。 */
export interface SetupGuideStep {
  id: string;
  label: string;
  title: string;
  desc: string;
}

export const SETUP_GUIDE_STEPS: readonly SetupGuideStep[] = [
  {
    id: "theme",
    label: "外观",
    title: "选择界面主题",
    desc: "浅色或深色可随时在设置中更改，偏好只保存在本机。"
  },
  {
    id: "ai",
    label: "AI",
    title: "配置 AI（可选）",
    desc: "不填也能手动录入与练习；需要 AI 出题或答疑时再配。配置仅保存在本机。"
  }
];

export const SETUP_GUIDE_STEP_IDS: readonly string[] = SETUP_GUIDE_STEPS.map((step) => step.id);

export function isKnownSetupStepId(id: unknown): boolean {
  return SETUP_GUIDE_STEP_IDS.includes(String(id || ""));
}

export function normalizeSeenSetupSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique: string[] = [];
  for (const item of value) {
    const id = String(item || "");
    if (isKnownSetupStepId(id) && !unique.includes(id)) unique.push(id);
  }
  return unique;
}

export function getPendingSetupSteps(seenSetupSteps: unknown = []): SetupGuideStep[] {
  const seen = new Set(normalizeSeenSetupSteps(seenSetupSteps));
  return SETUP_GUIDE_STEPS.filter((step) => !seen.has(step.id));
}

export function hasPendingSetupSteps(seenSetupSteps: unknown = []): boolean {
  return getPendingSetupSteps(seenSetupSteps).length > 0;
}
