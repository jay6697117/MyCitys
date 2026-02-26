import type { GovernanceState } from "../domain/types.js";
import { MAX_COLLAPSE_VALUE } from "./constants.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function settleGovernance(current: GovernanceState): GovernanceState {
  let cv = current.cv;

  if (current.security < 40) {
    cv += 10;
  }
  if (current.morale < 40) {
    cv += 10;
  }
  if (current.corruption > 60) {
    cv += 10;
  }
  if (current.security < 20) {
    cv += 10;
  }
  if (current.morale < 20) {
    cv += 10;
  }
  if (current.corruption > 80) {
    cv += 10;
  }
  if (current.security >= 70 && current.morale >= 70 && current.corruption <= 40) {
    cv -= 15;
  }

  return {
    ...current,
    cv: clamp(cv, 0, MAX_COLLAPSE_VALUE)
  };
}
