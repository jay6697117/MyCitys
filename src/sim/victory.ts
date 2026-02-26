import { MAX_COLLAPSE_VALUE } from "./constants.js";
import type { Outcome } from "../domain/types.js";

export interface OutcomeInput {
  annexedCities: number;
  capitalLost: boolean;
  cv: number;
}

export function evaluateOutcome(input: OutcomeInput): Outcome {
  if (input.capitalLost || input.cv >= MAX_COLLAPSE_VALUE) {
    return "defeat";
  }
  if (input.annexedCities >= 11) {
    return "victory";
  }
  return "ongoing";
}
