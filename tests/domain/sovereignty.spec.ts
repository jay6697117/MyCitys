import { describe, expect, it } from "vitest";
import {
  canPeacefullyDeclareIndependence,
  canRelocateCapital,
  getProtectionStatus
} from "../../src/domain/sovereignty.js";

describe("sovereignty", () => {
  it("standard difficulty can only use peaceful independence", () => {
    expect(
      canPeacefullyDeclareIndependence({
        difficulty: "standard",
        prestige: 80,
        morale: 80,
        ransomPaid: true
      })
    ).toBe(true);
  });

  it("protection lasts 20 minutes", () => {
    const status = getProtectionStatus({ elapsedMinutes: 10 });
    expect(status.active).toBe(true);
  });

  it("capital relocation has 60-minute cooldown", () => {
    expect(canRelocateCapital({ minutesSinceLastRelocation: 30 })).toBe(false);
  });
});
