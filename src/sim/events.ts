import { EVENT_INTERVAL_SECONDS } from "./constants.js";

export interface EventContext {
  security: number;
  morale: number;
  corruption: number;
}

export interface EventChoice {
  id: string;
  label: string;
  impact: {
    security: number;
    morale: number;
    corruption: number;
  };
}

interface WeightedChoice extends EventChoice {
  weight: number;
}

export function shouldTriggerEvent(input: { elapsedSeconds: number }): boolean {
  return input.elapsedSeconds > 0 && input.elapsedSeconds % EVENT_INTERVAL_SECONDS === 0;
}

function computeWeight(base: number, context: EventContext): number {
  let weight = base;
  if (context.security < 50) {
    weight += 1;
  }
  if (context.morale < 50) {
    weight += 1;
  }
  if (context.corruption > 50) {
    weight += 1;
  }
  return weight;
}

export function buildEventChoices(context: EventContext): EventChoice[] {
  const pool: WeightedChoice[] = [
    {
      id: "grain-relief",
      label: "开仓赈济",
      impact: { security: 5, morale: 8, corruption: 2 },
      weight: computeWeight(3, context)
    },
    {
      id: "military-crackdown",
      label: "军管整肃",
      impact: { security: 8, morale: -5, corruption: 1 },
      weight: computeWeight(context.security < 40 ? 5 : 2, context)
    },
    {
      id: "anti-corruption-drive",
      label: "反腐清查",
      impact: { security: 2, morale: 3, corruption: -10 },
      weight: computeWeight(context.corruption > 60 ? 6 : 2, context)
    },
    {
      id: "tax-cut",
      label: "临时减税",
      impact: { security: 1, morale: 5, corruption: 0 },
      weight: computeWeight(context.morale < 45 ? 5 : 2, context)
    }
  ];

  return pool
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ id, label, impact }) => ({ id, label, impact }));
}
