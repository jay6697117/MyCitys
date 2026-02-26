import { describe, expect, it } from "vitest";
import { createTickEngine } from "../../src/sim/tickEngine.js";

describe("tick engine", () => {
  it("advances exactly one world tick per 60s", () => {
    const engine = createTickEngine();
    engine.advance(60000);
    expect(engine.getState().ticks).toBe(1);
  });
});
