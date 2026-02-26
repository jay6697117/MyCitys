import { AUTOSAVE_INTERVAL_MINUTES } from "../sim/constants.js";

export interface SaveRecord {
  id: number;
  kind: "auto" | "manual";
  timestamp: number;
  stateJson: string;
}

export const SAVE_SCHEMA = {
  autosaveIntervalMinutes: AUTOSAVE_INTERVAL_MINUTES,
  tableName: "saves"
};
