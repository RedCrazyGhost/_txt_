import { describe, expect, it } from "vitest";
import type { Question } from "../models/question/types";
import {
  buildQuestionReportIssue,
  buildQuestionReportIssueUrl,
  formatQuestionPreview
} from "./questionReport";

const sampleBank = {
  name: "测试题集",
  type: "数学",
  author: "Tester",
  bankId: "bank-1",
  bankSource: "remote",
  version: "0.0.3"
};

const sampleQuestion = {
  questionType: "singleChoice",
  stem: "1 + 1 = ?",
  options: [
    { key: "A", text: "1" },
    { key: "B", text: "2" }
  ],
  answers: [["B"]],
  explanation: "基础加法",
  MD5: false,
  image: ""
} as Question;

describe("questionReport", () => {
  it("formatQuestionPreview uses stem and truncates long text", () => {
    expect(formatQuestionPreview(sampleQuestion)).toBe("1 + 1 = ?");
    expect(formatQuestionPreview({ texts: ["a", "b", "c"] } as Question)).toBe("a b c");
    expect(formatQuestionPreview({ stem: "x".repeat(250) } as Question).length).toBe(201);
  });

  it("buildQuestionReportIssue includes bank and question index", () => {
    const { title, body } = buildQuestionReportIssue({
      bank: sampleBank,
      question: sampleQuestion,
      qindex: 2,
      reportTypes: ["content", "answer"],
      userNote: "选项 A 表述不清",
      appVersion: "2.0.4"
    });

    expect(title).toBe("[题目反馈] 测试题集 - 第3题 - 题目内容有误 / 答案不正确");
    expect(body).toContain("名称: 测试题集");
    expect(body).toContain("题号: 第 3 题");
    expect(body).toContain("选项 A 表述不清");
    expect(body).toContain("网站版本: 2.0.4");
    expect(body).toContain('"stem": "1 + 1 = ?"');
    expect(body).toContain("第1空: B");
  });

  it("does not expose plaintext answers for MD5 questions", () => {
    const { body } = buildQuestionReportIssue({
      bank: sampleBank,
      question: {
        ...sampleQuestion,
        MD5: true,
        answers: [["secret-hash"]]
      },
      qindex: 0,
      reportTypes: ["answer"],
      userNote: "",
      appVersion: "2.0.4"
    });

    expect(body).toContain("答案已加密，请对照原题集");
    expect(body).not.toContain("secret-hash");
  });

  it("buildQuestionReportIssueUrl encodes title and body", () => {
    const url = buildQuestionReportIssueUrl({
      owner: "RedCrazyGhost",
      repo: "_txt_",
      bank: sampleBank,
      question: sampleQuestion,
      qindex: 0,
      reportTypes: ["explanation"],
      userNote: "解析有误",
      appVersion: "2.0.4"
    });

    expect(url).toMatch(
      /^https:\/\/github\.com\/RedCrazyGhost\/_txt_\/issues\/new\?/
    );
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain(
      "[题目反馈] 测试题集 - 第1题 - 解析有误"
    );
    expect(url).toContain("labels=question-report");
    expect(decodeURIComponent(url)).toContain("解析有误");
  });

  it("omits question json when body exceeds length limit", () => {
    const longQuestion = {
      ...sampleQuestion,
      stem: "x".repeat(6000),
      explanation: "y".repeat(6000)
    } as Question;

    const { body } = buildQuestionReportIssue({
      bank: sampleBank,
      question: longQuestion,
      qindex: 0,
      reportTypes: ["content"],
      userNote: "",
      appVersion: "2.0.4"
    });

    expect(body.length).toBeLessThanOrEqual(5000);
    expect(body).toContain("完整 JSON 请在本地导出题集后附上");
    expect(body).not.toContain('"stem"');
  });
});
