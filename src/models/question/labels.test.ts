import { describe, expect, it } from "vitest";
import { getQuestionTypeLabel, getQuestionTypeBadgeClass } from "./labels";

describe("question labels", () => {
  it("returns Chinese labels for all question types", () => {
    expect(getQuestionTypeLabel("fillBlank")).toBe("填空题");
    expect(getQuestionTypeLabel("singleChoice")).toBe("单选题");
    expect(getQuestionTypeLabel("multipleChoice")).toBe("多选题");
    expect(getQuestionTypeLabel("subjective")).toBe("主观题");
  });

  it("returns badge classes for all question types", () => {
    expect(getQuestionTypeBadgeClass("fillBlank")).toBe("text-bg-secondary");
    expect(getQuestionTypeBadgeClass("singleChoice")).toBe("text-bg-primary");
    expect(getQuestionTypeBadgeClass("multipleChoice")).toBe("text-bg-info");
    expect(getQuestionTypeBadgeClass("subjective")).toBe("text-bg-warning");
  });
});
