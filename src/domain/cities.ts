import type { CityConfig, CityTier } from "./types.js";

export const CITIES: CityConfig[] = [
  { name: "洛阳", tier: "capital" },
  { name: "建业", tier: "capital" },
  { name: "成都", tier: "capital" },
  { name: "许昌", tier: "core" },
  { name: "襄阳", tier: "core" },
  { name: "汉中", tier: "core" },
  { name: "长安", tier: "frontier" },
  { name: "邺城", tier: "frontier" },
  { name: "江陵", tier: "frontier" },
  { name: "合肥", tier: "frontier" },
  { name: "寿春", tier: "frontier" },
  { name: "北平", tier: "frontier" }
];

const CITY_TIER_MAP = new Map<string, CityTier>(
  CITIES.map((city) => [city.name, city.tier])
);

export function getCityTier(name: string): CityTier {
  const tier = CITY_TIER_MAP.get(name);
  if (!tier) {
    throw new Error(`Unknown city: ${name}`);
  }
  return tier;
}
