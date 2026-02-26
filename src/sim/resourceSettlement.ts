import type { ResourceState } from "../domain/types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function settleResources(current: ResourceState): ResourceState {
  const grainDelta = Math.floor(current.population * 0.02) - Math.floor(current.armament * 0.1);
  const goldDelta = Math.floor(current.population * 0.01) - Math.floor(current.armament * 0.05);
  const populationDelta = current.security >= 60 ? 5 : -5;
  const securityDelta = current.armament >= 50 ? 1 : -1;
  const armamentDelta = Math.max(-2, Math.floor(current.gold / 100) - 1);

  return {
    grain: Math.max(0, current.grain + grainDelta),
    gold: Math.max(0, current.gold + goldDelta),
    population: Math.max(1, current.population + populationDelta),
    security: clamp(current.security + securityDelta, 0, 100),
    armament: clamp(current.armament + armamentDelta, 0, 100)
  };
}
