import { describe, expect, it } from "vitest";
import { settleGovernance } from "../../src/sim/governanceSettlement.js";

describe("governance settlement", () => {
  it("adds CV when security/morale low or corruption high", () => {
    const next = settleGovernance({ security: 30, morale: 30, corruption: 70, cv: 0 });
    expect(next.cv).toBeGreaterThan(0);
  });

  it("reduces CV when healthy", () => {
    const next = settleGovernance({ security: 75, morale: 75, corruption: 35, cv: 50 });
    expect(next.cv).toBeLessThan(50);
  });
});
