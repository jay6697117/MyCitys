import { describe, expect, it } from "vitest";
import { runOneTick } from "../../src/cli/run.js";

describe("run loop", () => {
  it("returns updated summary after one tick", () => {
    const summary = runOneTick();
    expect(summary).toHaveProperty("tick");
  });
});
