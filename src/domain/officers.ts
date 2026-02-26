import type { Officer } from "./types.js";

export interface AutoReassignInput {
  officers?: Officer[];
  lockedIds: string[];
  cooldownMinutes: number;
  minutesSinceLastReassign?: number;
}

export interface AutoReassignResult {
  touchedLocked: boolean;
  cooldownReady: boolean;
  reassignedCount: number;
}

export interface PromotionFailureInput {
  loyalty: number;
  resourceCost?: number;
}

export interface PromotionFailureResult {
  loyalty: number;
  resourcesLost: number;
}

export function autoReassign(input: AutoReassignInput): AutoReassignResult {
  const cooldownReady =
    input.minutesSinceLastReassign === undefined
      ? true
      : input.minutesSinceLastReassign >= input.cooldownMinutes;

  if (!cooldownReady) {
    return {
      touchedLocked: false,
      cooldownReady,
      reassignedCount: 0
    };
  }

  const lockedSet = new Set(input.lockedIds);
  const officers = input.officers ?? [];
  const movable = officers.filter((officer) => !lockedSet.has(officer.id) && !officer.locked);

  return {
    touchedLocked: false,
    cooldownReady,
    reassignedCount: movable.length
  };
}

export function onPromotionFailure(input: PromotionFailureInput): PromotionFailureResult {
  return {
    loyalty: Math.max(0, input.loyalty - 10),
    resourcesLost: input.resourceCost ?? 1
  };
}

export function canBePoached(loyalty: number): boolean {
  return loyalty < 30;
}
