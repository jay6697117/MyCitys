import { describe, expect, it } from "vitest";
import { SaveRepository } from "../../src/infra/saveRepository.js";

describe("save repository", () => {
  it("creates autosave every 10 minutes", () => {
    const repo = new SaveRepository(":memory:");
    repo.autoSaveIfDue({ elapsedMinutes: 10, state: { tick: 10 } });
    expect(repo.countSaves()).toBe(1);
  });
});
