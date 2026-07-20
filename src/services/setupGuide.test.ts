import { describe, expect, it } from "vitest";
import {
  getPendingSetupSteps,
  hasPendingSetupSteps,
  normalizeSeenSetupSteps,
  SETUP_GUIDE_STEP_IDS
} from "./setupGuide";

describe("setupGuide", () => {
  it("filters known step ids only", () => {
    expect(normalizeSeenSetupSteps(["theme", "nope", "ai", "theme"])).toEqual(["theme", "ai"]);
  });

  it("returns pending steps not yet seen", () => {
    expect(getPendingSetupSteps([]).map((step) => step.id)).toEqual(SETUP_GUIDE_STEP_IDS);
    expect(getPendingSetupSteps(["theme"]).map((step) => step.id)).toEqual(
      SETUP_GUIDE_STEP_IDS.filter((id) => id !== "theme")
    );
    expect(hasPendingSetupSteps(SETUP_GUIDE_STEP_IDS)).toBe(false);
  });
});
