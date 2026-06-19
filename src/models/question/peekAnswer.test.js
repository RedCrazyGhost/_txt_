import { describe, expect, it } from "vitest";
import { buildPeekResults, resolvePeekAnswer } from "./peekAnswer";

describe("peekAnswer", () => {
  it("matches singleChoice answer to option key case-insensitively", () => {
    const question = {
      questionType: "singleChoice",
      stem: "题干",
      options: [
        { key: "A", text: "选项A" },
        { key: "B", text: "选项B" },
        { key: "C", text: "选项C" }
      ],
      answers: [["c", "C"]]
    };

    expect(resolvePeekAnswer(question, 0)).toBe("C");
    expect(buildPeekResults(question)).toEqual(["C"]);
  });
});
