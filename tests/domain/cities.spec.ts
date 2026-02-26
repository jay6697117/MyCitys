import { describe, expect, it } from "vitest";
import { CITIES, getCityTier } from "../../src/domain/cities.js";

describe("city config", () => {
  it("contains exactly 12 cities", () => {
    expect(CITIES).toHaveLength(12);
  });

  it("uses locked tiers", () => {
    expect(getCityTier("洛阳")).toBe("capital");
    expect(getCityTier("许昌")).toBe("core");
    expect(getCityTier("长安")).toBe("frontier");
  });
});
