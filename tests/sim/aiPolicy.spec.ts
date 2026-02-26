import { describe, expect, it } from "vitest";
import { pickAiActions } from "../../src/sim/aiPolicy.js";

describe("ai policy", () => {
  it("returns at most 3 actions per tick", () => {
    const actions = pickAiActions({
      self: { deficit: true },
      target: { securityLow: true, moraleLow: true, corruptionHigh: true }
    });
    expect(actions.length).toBeLessThanOrEqual(3);
  });
});
