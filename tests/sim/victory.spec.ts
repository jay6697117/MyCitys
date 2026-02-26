import { describe, expect, it } from "vitest";
import { evaluateOutcome } from "../../src/sim/victory.js";

describe("victory and defeat", () => {
  it("wins when all other 11 cities annexed", () => {
    const outcome = evaluateOutcome({ annexedCities: 11, capitalLost: false, cv: 0 });
    expect(outcome).toBe("victory");
  });

  it("defeats when cv reaches 300", () => {
    const outcome = evaluateOutcome({ annexedCities: 3, capitalLost: false, cv: 300 });
    expect(outcome).toBe("defeat");
  });
});
