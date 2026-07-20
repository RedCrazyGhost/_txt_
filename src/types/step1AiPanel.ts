import type { ReviewedQuestion } from "../services/ai/reviewGeneratedAnswers";

export const EXAMPLE_PROMPTS = [
  "生成 5 道高中数学一元二次方程填空题，难度中等",
  "出 10 道 C 语言基础单选题，含指针与数组",
  "混合 8 题：JavaScript 闭包与原型链，简单易懂"
] as const;

export type WriteMode = "replace" | "append";
export type MessageRole = "user" | "assistant";
export type MessageVariant = "default" | "error" | "success";
export type LoadingPhase = "generate" | "review" | "";

export interface GenerationMeta {
  name?: string;
  type?: string;
  author?: string;
}

export interface AiPanelMessage {
  role: MessageRole;
  content: string;
  variant?: MessageVariant;
  questions?: ReviewedQuestion[];
  meta?: GenerationMeta;
  selected: boolean[];
  showAnswers?: boolean;
  showExplanation?: boolean;
  writeMode?: WriteMode | null;
}

export type AiPanelMessageExtra = Partial<Omit<AiPanelMessage, "role" | "content">>;
