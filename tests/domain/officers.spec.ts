import { describe, expect, it } from "vitest";
import { autoReassign, canBePoached, onPromotionFailure } from "../../src/domain/officers.js";

describe("officer system", () => {
  it("auto reassign respects locked officers", () => {
    const result = autoReassign({
      officers: [{ id: "A", loyalty: 80, locked: true }],
      lockedIds: ["A"],
      cooldownMinutes: 5
    });
    expect(result.touchedLocked).toBe(false);
  });

  it("promotion failure reduces loyalty", () => {
    const next = onPromotionFailure({ loyalty: 60 });
    expect(next.loyalty).toBeLessThan(60);
  });

  it("low loyalty is poachable", () => {
    expect(canBePoached(25)).toBe(true);
  });
});
