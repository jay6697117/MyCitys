import { describe, expect, it } from "vitest";
import { createNewGame } from "../../src/domain/newGame.js";
import { SaveRepository } from "../../src/infra/saveRepository.js";
import { runSimulation } from "../../src/cli/run.js";
import { evaluateOutcome } from "../../src/sim/victory.js";

describe("integration", () => {
  it("supports new game, multi tick simulation, outcome checks, and save/load", () => {
    const game = createNewGame({ difficulty: "standard", seed: 42 });
    expect(game.playerCityName.length).toBeGreaterThan(0);

    const state = runSimulation(42, 120);
    expect(state.tick).toBeGreaterThan(0);

    const reachableVictory = evaluateOutcome({ annexedCities: 11, capitalLost: false, cv: 0 });
    const reachableDefeat = evaluateOutcome({ annexedCities: 0, capitalLost: false, cv: 300 });
    expect(reachableVictory).toBe("victory");
    expect(reachableDefeat).toBe("defeat");

    const repo = new SaveRepository(":memory:");
    repo.manualSave(state);
    const loaded = repo.loadLatest<typeof state>();
    expect(loaded?.tick).toBe(state.tick);
  });
});
