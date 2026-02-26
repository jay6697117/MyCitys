import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/sim/gameSession.js";

describe("game session save/load", () => {
  it("restores latest manual save state", () => {
    const session = new GameSession(42, "standard");

    const firstTick = session.manualAdvanceTick();
    expect(firstTick.ok).toBe(true);

    const savedSnapshot = session.getSnapshot();
    const saveResult = session.manualSave();
    expect(saveResult.ok).toBe(true);

    const secondTick = session.manualAdvanceTick();
    expect(secondTick.ok).toBe(true);
    expect(session.getSnapshot().session.tick).toBeGreaterThan(savedSnapshot.session.tick);

    const loadResult = session.loadLatestSave();
    expect(loadResult.ok).toBe(true);

    const restored = session.getSnapshot();
    expect(restored.session.tick).toBe(savedSnapshot.session.tick);
    expect(restored.session.elapsedSeconds).toBe(savedSnapshot.session.elapsedSeconds);
    expect(restored.resources.grain).toBe(savedSnapshot.resources.grain);
    expect(restored.resources.gold).toBe(savedSnapshot.resources.gold);
    expect(restored.resources.population).toBe(savedSnapshot.resources.population);
    expect(restored.resources.armament).toBe(savedSnapshot.resources.armament);
    expect(restored.governance.cv).toBe(savedSnapshot.governance.cv);
  });

  it("fails to load when no save exists", () => {
    const session = new GameSession(42, "standard");
    const result = session.loadLatestSave();
    expect(result.ok).toBe(false);
  });
});
