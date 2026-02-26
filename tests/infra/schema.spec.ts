import { describe, expect, it } from "vitest";
import { SAVE_SCHEMA } from "../../src/infra/schema.js";

describe("save schema", () => {
  it("uses expected table and autosave interval", () => {
    expect(SAVE_SCHEMA.tableName).toBe("saves");
    expect(SAVE_SCHEMA.autosaveIntervalMinutes).toBe(10);
  });
});
