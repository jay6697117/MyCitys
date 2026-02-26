import { describe, expect, it } from "vitest";
import { settleResources } from "../../src/sim/resourceSettlement.js";

describe("resource settlement", () => {
  it("updates grain/gold/pop/security/armament each tick", () => {
    const next = settleResources({
      grain: 100,
      gold: 100,
      population: 1000,
      security: 60,
      armament: 50
    });
    expect(next.grain).not.toBe(100);
    expect(next.gold).not.toBe(100);
  });
});
