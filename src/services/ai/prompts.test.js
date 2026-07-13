import { describe, expect, it } from "vitest";
import {
  buildQuestionTutorMessages,
  buildQuestionTutorSystemPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  serializeQuestionForTutor
} from "./prompts.js";

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

describe("buildQuestionTutorSystemPrompt", () => {
  it("describes tutor role and coaching principles", () => {
    const prompt = buildQuestionTutorSystemPrompt();

    expect(prompt).toContain("本题答疑助手");
    expect(prompt).toContain("引导用户思考");
    expect(prompt).toContain("不要生成新题目");
  });
});

describe("serializeQuestionForTutor", () => {
  it("includes stem, options, results and answers for non-MD5 questions", () => {
    const payload = JSON.parse(
      serializeQuestionForTutor({
        questionType: "singleChoice",
        stem: "1+1=?",
        options: [{ key: "A", text: "1" }, { key: "B", text: "2" }],
        results: ["B"],
        answers: [["B"]],
        explanation: "基础加法",
        image: "data:image/png;base64,abc"
      })
    );

    expect(payload.stem).toBe("1+1=?");
    expect(payload.options).toHaveLength(2);
    expect(payload.results).toEqual(["B"]);
    expect(payload.answers).toEqual([["B"]]);
    expect(payload.explanation).toBe("基础加法");
    expect(payload.hasImage).toBe(true);
    expect(payload.MD5).toBe(false);
    expect(payload.image).toBeUndefined();
  });

  it("strips answers and explanation for MD5 questions", () => {
    const payload = JSON.parse(
      serializeQuestionForTutor({
        MD5: true,
        texts: ["1+1=", ""],
        answers: [["2"]],
        explanation: "secret",
        results: ["3"]
      })
    );

    expect(payload.MD5).toBe(true);
    expect(payload.texts).toEqual(["1+1=", ""]);
    expect(payload.results).toEqual(["3"]);
    expect(payload.answers).toBeUndefined();
    expect(payload.explanation).toBeUndefined();
  });
});

describe("buildQuestionTutorMessages", () => {
  it("builds system prompt with question JSON and appends history plus user text", () => {
    const messages = buildQuestionTutorMessages({
      question: {
        questionType: "fillBlank",
        texts: ["2+2=", ""],
        results: ["4"],
        answers: [["4"]]
      },
      history: [{ role: "user", content: "我答对了吗？" }],
      userText: "为什么？"
    });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("【本题数据】");
    expect(messages[0].content).toContain('"texts"');
    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({ role: "user", content: "我答对了吗？" });
    expect(messages[2]).toEqual({ role: "user", content: "为什么？" });
  });
});
