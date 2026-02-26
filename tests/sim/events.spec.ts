import { describe, expect, it } from "vitest";
import { buildEventChoices, shouldTriggerEvent } from "../../src/sim/events.js";

describe("events", () => {
  it("triggers every 5 minutes", () => {
    expect(shouldTriggerEvent({ elapsedSeconds: 300 })).toBe(true);
  });

  it("always returns exactly 3 options", () => {
    const choices = buildEventChoices({ security: 30, morale: 40, corruption: 70 });
    expect(choices).toHaveLength(3);
  });
});
