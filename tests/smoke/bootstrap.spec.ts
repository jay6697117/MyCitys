import { describe, expect, it } from "vitest";
import { bootstrap } from "../../src/index.js";

describe("bootstrap", () => {
  it("returns app metadata", () => {
    const meta = bootstrap();
    expect(meta.name).toBe("city-sim");
  });
});
