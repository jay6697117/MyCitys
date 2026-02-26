import type { Difficulty } from "./types.js";

export interface IndependenceInput {
  difficulty: Difficulty;
  prestige: number;
  morale: number;
  ransomPaid: boolean;
}

export interface ProtectionInput {
  elapsedMinutes: number;
  totalMinutes?: number;
}

export interface ProtectionStatus {
  active: boolean;
  remainingMinutes: number;
}

export interface RelocationInput {
  minutesSinceLastRelocation: number;
  cooldownMinutes?: number;
}

export function canPeacefullyDeclareIndependence(input: IndependenceInput): boolean {
  if (input.difficulty === "newbie" || input.difficulty === "easy") {
    return true;
  }
  return input.prestige >= 70 && input.morale >= 70 && input.ransomPaid;
}

export function getProtectionStatus(input: ProtectionInput): ProtectionStatus {
  const total = input.totalMinutes ?? 20;
  const remaining = Math.max(0, total - input.elapsedMinutes);
  return {
    active: remaining > 0,
    remainingMinutes: remaining
  };
}

export function canRelocateCapital(input: RelocationInput): boolean {
  const cooldown = input.cooldownMinutes ?? 60;
  return input.minutesSinceLastRelocation >= cooldown;
}
