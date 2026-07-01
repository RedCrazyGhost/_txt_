import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

describe("buildSystemPrompt", () => {
  it("includes format rules for fill-blank and single-choice", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("填空题");
    expect(prompt).toContain("单选题");
    expect(prompt).toContain("A-D");
    expect(prompt).toContain("偶数");
    expect(prompt).toContain("常见错误");
  });

  it("includes generation principles and few-shot examples", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("生成原则");
    expect(prompt).toContain("未指定时默认 5 道");
    expect(prompt).toContain("完整输出示例");
    expect(prompt).toContain('"txt":"1+1=_2_"');
    expect(prompt).toContain("下面正确的字符常量是_c,C_");
  });
});

describe("buildUserPrompt", () => {
  it("structures prompt with execution instructions and default count hint", () => {
    const prompt = buildUserPrompt("生成 10 道高中数学填空题", []);

    expect(prompt).toContain("【生成要求】");
    expect(prompt).toContain("生成 10 道高中数学填空题");
    expect(prompt).toContain("【执行说明】");
    expect(prompt).toContain("未说明则 5 道");
    expect(prompt).not.toContain("【参考内容】");
  });

  it("includes reference block and reference-specific instructions", () => {
    const prompt = buildUserPrompt("根据参考内容生成 3 题", [
      { name: "notes.txt", content: "一元二次方程定义", size: 8 }
    ]);

    expect(prompt).toContain("【参考内容】");
    expect(prompt).toContain("--- 参考 1：notes.txt ---");
    expect(prompt).toContain("一元二次方程定义");
    expect(prompt).toContain("以参考为准");
    expect(prompt).toContain("单选答案为 A-D 字母");
  });
});
