import { describe, expect, it } from "vitest";
import {
  AUTOSAVE_INTERVAL_MINUTES,
  EVENT_INTERVAL_SECONDS,
  MAX_COLLAPSE_VALUE,
  TICK_MS
} from "../../src/sim/constants.js";

describe("sim constants", () => {
  it("matches locked timing and limits", () => {
    expect(TICK_MS).toBe(60000);
    expect(EVENT_INTERVAL_SECONDS).toBe(300);
    expect(AUTOSAVE_INTERVAL_MINUTES).toBe(10);
    expect(MAX_COLLAPSE_VALUE).toBe(300);
  });
});
