export interface ScalePenalty {
  corruptionGrowthBonus: number;
  fluctuationMultiplier: number;
}

export function getScalePenalty(scale: number): ScalePenalty {
  if (!Number.isInteger(scale) || scale < 1 || scale > 10) {
    throw new Error("Scale must be an integer between 1 and 10");
  }

  if (scale <= 4) {
    return {
      corruptionGrowthBonus: 0,
      fluctuationMultiplier: 1
    };
  }

  if (scale <= 6) {
    return {
      corruptionGrowthBonus: 0.5,
      fluctuationMultiplier: 1.25
    };
  }

  if (scale <= 8) {
    return {
      corruptionGrowthBonus: 0.5,
      fluctuationMultiplier: 1.5
    };
  }

  return {
    corruptionGrowthBonus: 0.5,
    fluctuationMultiplier: 1.75
  };
}
