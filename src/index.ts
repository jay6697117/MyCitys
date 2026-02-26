export function bootstrap() {
  return { name: "city-sim", version: "0.1.0" };
}

export * from "./cli/run.js";
export * from "./domain/cities.js";
export * from "./domain/newGame.js";
export * from "./domain/officers.js";
export * from "./domain/sovereignty.js";
export * from "./sim/annexation.js";
export * from "./sim/aiPolicy.js";
export * from "./sim/events.js";
export * from "./sim/governanceSettlement.js";
export * from "./sim/resourceSettlement.js";
export * from "./sim/timeScale.js";
export * from "./sim/tickEngine.js";
export * from "./sim/victory.js";
