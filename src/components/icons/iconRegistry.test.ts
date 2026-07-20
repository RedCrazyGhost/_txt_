import { describe, expect, it } from "vitest";
import { resolveIconClass } from "./iconRegistry";

describe("resolveIconClass", () => {
  it("maps semantic names to solid webfont classes", () => {
    expect(resolveIconClass("brain")).toEqual(["fas", "fa-brain"]);
    expect(resolveIconClass("wand-magic-sparkles")).toEqual([
      "fas",
      "fa-wand-magic-sparkles"
    ]);
  });

  it("accepts fa- prefixed and full class strings", () => {
    expect(resolveIconClass("fa-times")).toEqual(["fas", "fa-times"]);
    expect(resolveIconClass("fas fa-atom")).toEqual(["fas", "fa-atom"]);
  });

  it("falls back for empty name", () => {
    expect(resolveIconClass("")).toEqual(["fas", "fa-smile"]);
  });
});
