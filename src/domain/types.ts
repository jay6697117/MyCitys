export type CityTier = "capital" | "core" | "frontier";

export type Difficulty = "newbie" | "easy" | "standard" | "hard";

export type Affiliation = "independent" | "wei" | "shu" | "wu";

export interface CityConfig {
  name: string;
  tier: CityTier;
}

export interface NewGameInput {
  difficulty: Difficulty;
  seed: number;
}

export interface NewGameState {
  difficulty: Difficulty;
  seed: number;
  playerCityName: string;
  playerCityTier: CityTier;
  playerAffiliation: Affiliation;
  aiForces: Affiliation[];
}

export interface ResourceState {
  grain: number;
  gold: number;
  population: number;
  security: number;
  armament: number;
}

export interface GovernanceState {
  security: number;
  morale: number;
  corruption: number;
  cv: number;
}

export type AnnexationLane = "economic" | "diplomatic" | "war";

export interface Officer {
  id: string;
  loyalty: number;
  locked: boolean;
}

export type Outcome = "ongoing" | "victory" | "defeat";
