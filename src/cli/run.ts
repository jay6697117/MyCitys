import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createNewGame } from "../domain/newGame.js";
import type { Difficulty, GovernanceState, ResourceState } from "../domain/types.js";
import { settleGovernance } from "../sim/governanceSettlement.js";
import { settleResources } from "../sim/resourceSettlement.js";
import { evaluateOutcome } from "../sim/victory.js";

export interface RuntimeState {
  tick: number;
  difficulty: Difficulty;
  resources: ResourceState;
  governance: GovernanceState;
  annexedCities: number;
  capitalLost: boolean;
}

export function createInitialState(seed = 42, difficulty: Difficulty = "standard"): RuntimeState {
  createNewGame({ difficulty, seed });

  return {
    tick: 0,
    difficulty,
    resources: {
      grain: 1000,
      gold: 1000,
      population: 1000,
      security: 60,
      armament: 50
    },
    governance: {
      security: 60,
      morale: 60,
      corruption: 40,
      cv: 0
    },
    annexedCities: 0,
    capitalLost: false
  };
}

export function advanceOneTick(state: RuntimeState): RuntimeState {
  const resources = settleResources(state.resources);
  const governance = settleGovernance(state.governance);
  const annexedCities =
    resources.armament >= 70 && governance.security >= 55
      ? Math.min(11, state.annexedCities + 1)
      : state.annexedCities;

  return {
    ...state,
    tick: state.tick + 1,
    resources,
    governance,
    annexedCities
  };
}

export function runOneTick(state?: RuntimeState): RuntimeState {
  const initial = state ?? createInitialState();
  return advanceOneTick(initial);
}

export function runSimulation(seed: number, ticks: number): RuntimeState {
  let state = createInitialState(seed, "standard");
  for (let i = 0; i < ticks; i += 1) {
    state = advanceOneTick(state);
    const outcome = evaluateOutcome({
      annexedCities: state.annexedCities,
      capitalLost: state.capitalLost,
      cv: state.governance.cv
    });
    if (outcome !== "ongoing") {
      break;
    }
  }
  return state;
}

function parseArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function toInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isMainModule()) {
  const seed = toInt(parseArg("--seed"), 42);
  const ticks = toInt(parseArg("--ticks"), 1);
  const state = runSimulation(seed, ticks);
  const outcome = evaluateOutcome({
    annexedCities: state.annexedCities,
    capitalLost: state.capitalLost,
    cv: state.governance.cv
  });
  console.log(
    JSON.stringify(
      {
        tick: state.tick,
        annexedCities: state.annexedCities,
        cv: state.governance.cv,
        outcome
      },
      null,
      2
    )
  );
}
