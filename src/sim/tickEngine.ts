import { TICK_MS } from "./constants.js";

export interface TickEngineState {
  ticks: number;
  carryMs: number;
}

export interface TickEngine {
  advance: (elapsedMs: number) => number;
  getState: () => TickEngineState;
}

export function createTickEngine(initial?: Partial<TickEngineState>): TickEngine {
  const state: TickEngineState = {
    ticks: initial?.ticks ?? 0,
    carryMs: initial?.carryMs ?? 0
  };

  return {
    advance(elapsedMs: number) {
      if (elapsedMs < 0) {
        throw new Error("elapsedMs must be >= 0");
      }
      state.carryMs += elapsedMs;
      const gainedTicks = Math.floor(state.carryMs / TICK_MS);
      if (gainedTicks > 0) {
        state.ticks += gainedTicks;
        state.carryMs = state.carryMs % TICK_MS;
      }
      return gainedTicks;
    },
    getState() {
      return { ...state };
    }
  };
}
