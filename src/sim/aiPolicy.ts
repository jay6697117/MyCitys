import type { AnnexationLane } from "../domain/types.js";

export interface AiPolicyContext {
  self: {
    deficit?: boolean;
    militaryReady?: boolean;
    diplomaticLeverage?: boolean;
  };
  target: {
    securityLow?: boolean;
    moraleLow?: boolean;
    corruptionHigh?: boolean;
  };
  relation?: "neutral" | "hostile" | "friendly";
}

export interface AiAction {
  lane: AnnexationLane;
  score: number;
  reason: string;
}

export function pickAiActions(context: AiPolicyContext): AiAction[] {
  const scores: Record<AnnexationLane, number> = {
    economic: 1,
    diplomatic: 1,
    war: 1
  };

  if (context.self.deficit) {
    scores.economic += 3;
  }
  if (context.self.diplomaticLeverage) {
    scores.diplomatic += 2;
  }
  if (context.self.militaryReady) {
    scores.war += 2;
  }

  if (context.target.corruptionHigh) {
    scores.economic += 2;
    scores.diplomatic += 1;
  }
  if (context.target.moraleLow) {
    scores.diplomatic += 2;
    scores.war += 1;
  }
  if (context.target.securityLow) {
    scores.war += 3;
  }

  if (context.relation === "hostile") {
    scores.war += 1;
  }
  if (context.relation === "friendly") {
    scores.diplomatic += 1;
  }

  const reasons: Record<AnnexationLane, string> = {
    economic: "resource pressure exploit",
    diplomatic: "political instability exploit",
    war: "security weakness exploit"
  };

  return (Object.keys(scores) as AnnexationLane[])
    .map((lane) => ({
      lane,
      score: scores[lane],
      reason: reasons[lane]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
