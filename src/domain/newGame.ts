import { CITIES } from "./cities.js";
import type { Affiliation, CityConfig, CityTier, Difficulty, NewGameInput, NewGameState } from "./types.js";

const FORCES: Affiliation[] = ["wei", "shu", "wu"];

function createRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function pickOne<T>(items: T[], rand: () => number): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from empty list");
  }
  const index = Math.floor(rand() * items.length);
  return items[index]!;
}

function allowedTiersByDifficulty(difficulty: Difficulty): CityTier[] {
  if (difficulty === "standard" || difficulty === "hard") {
    return ["core", "frontier"];
  }
  return ["capital", "core", "frontier"];
}

function resolvePlayerAffiliation(difficulty: Difficulty, rand: () => number): Affiliation {
  if (difficulty === "newbie" || difficulty === "easy") {
    return "independent";
  }
  return pickOne(FORCES, rand);
}

function resolveAiForces(playerAffiliation: Affiliation): Affiliation[] {
  if (playerAffiliation === "independent") {
    return [...FORCES];
  }
  return FORCES.filter((force) => force !== playerAffiliation);
}

function filterCitiesByTier(cities: CityConfig[], tiers: CityTier[]): CityConfig[] {
  const set = new Set(tiers);
  return cities.filter((city) => set.has(city.tier));
}

export function createNewGame(input: NewGameInput): NewGameState {
  const rand = createRng(input.seed);
  const candidates = filterCitiesByTier(CITIES, allowedTiersByDifficulty(input.difficulty));
  const playerCity = pickOne(candidates, rand);
  const playerAffiliation = resolvePlayerAffiliation(input.difficulty, rand);

  return {
    difficulty: input.difficulty,
    seed: input.seed,
    playerCityName: playerCity.name,
    playerCityTier: playerCity.tier,
    playerAffiliation,
    aiForces: resolveAiForces(playerAffiliation)
  };
}
