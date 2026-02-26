import type { AnnexationLane, CityTier } from "../domain/types.js";

export type BattleOutcome = "majorWin" | "minorWin" | "draw" | "minorLose" | "majorLose";

export interface AnnexationActionInput {
  isv: number;
  lane: AnnexationLane;
  power: number;
  defense: number;
  battleOutcome?: BattleOutcome;
}

export interface AnnexationActionResult {
  isv: number;
  delta: number;
}

const BATTLE_OUTCOME_DELTA: Record<BattleOutcome, number> = {
  majorWin: -30,
  minorWin: -15,
  draw: -5,
  minorLose: 5,
  majorLose: 12
};

const TIER_THRESHOLD: Record<CityTier, number> = {
  frontier: 0,
  core: -50,
  capital: -100
};

export function isAnnexed(tier: CityTier, isv: number): boolean {
  return isv <= TIER_THRESHOLD[tier];
}

function resolveLaneDelta(input: AnnexationActionInput): number {
  const pressure = input.power - input.defense;
  switch (input.lane) {
    case "economic":
      return -Math.round(pressure);
    case "diplomatic":
      return -Math.round(pressure * 0.8);
    case "war":
      if (input.battleOutcome) {
        return BATTLE_OUTCOME_DELTA[input.battleOutcome];
      }
      return -Math.round(pressure * 1.2);
    default:
      return 0;
  }
}

export function applyAnnexationAction(input: AnnexationActionInput): AnnexationActionResult {
  const delta = resolveLaneDelta(input);
  return {
    isv: input.isv + delta,
    delta
  };
}
