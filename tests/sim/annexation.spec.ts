import { describe, expect, it } from "vitest";
import { applyAnnexationAction, isAnnexed } from "../../src/sim/annexation.js";

describe("annexation", () => {
  it("capital requires lower ISV threshold than frontier", () => {
    expect(isAnnexed("capital", -100)).toBe(true);
    expect(isAnnexed("capital", -50)).toBe(false);
    expect(isAnnexed("frontier", 0)).toBe(true);
  });

  it("action decreases ISV", () => {
    const next = applyAnnexationAction({
      isv: 20,
      lane: "economic",
      power: 30,
      defense: 10
    });
    expect(next.isv).toBeLessThan(20);
  });
});
