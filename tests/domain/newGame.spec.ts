import { describe, expect, it } from "vitest";
import { createNewGame } from "../../src/domain/newGame.js";

describe("new game", () => {
  it("standard difficulty never starts on capital", () => {
    const game = createNewGame({ difficulty: "standard", seed: 42 });
    expect(game.playerCityTier).not.toBe("capital");
  });

  it("newbie starts as independent force", () => {
    const game = createNewGame({ difficulty: "newbie", seed: 7 });
    expect(game.playerAffiliation).toBe("independent");
  });
});
