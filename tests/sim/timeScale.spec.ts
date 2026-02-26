import { describe, expect, it } from "vitest";
import { getScalePenalty } from "../../src/sim/timeScale.js";

describe("time scale", () => {
  it("applies heavy penalty from 5x", () => {
    const penalty = getScalePenalty(5);
    expect(penalty.corruptionGrowthBonus).toBe(0.5);
    expect(penalty.fluctuationMultiplier).toBeGreaterThan(1);
  });
});
