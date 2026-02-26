import { SAVE_SCHEMA } from "./schema.js";

export interface SavePayload {
  elapsedMinutes?: number;
  state: unknown;
}

interface InternalSave {
  id: number;
  kind: "auto" | "manual";
  timestamp: number;
  state: unknown;
}

export class SaveRepository {
  private saves: InternalSave[] = [];
  private lastAutoSaveMinute = -Infinity;
  private idSeq = 1;

  public constructor(private readonly dbPath: string) {}

  public autoSaveIfDue(input: SavePayload): boolean {
    const elapsed = input.elapsedMinutes ?? 0;
    if (elapsed - this.lastAutoSaveMinute < SAVE_SCHEMA.autosaveIntervalMinutes) {
      return false;
    }

    this.lastAutoSaveMinute = elapsed;
    this.saves.push({
      id: this.idSeq++,
      kind: "auto",
      timestamp: Date.now(),
      state: structuredClone(input.state)
    });
    return true;
  }

  public manualSave(state: unknown): number {
    const id = this.idSeq++;
    this.saves.push({
      id,
      kind: "manual",
      timestamp: Date.now(),
      state: structuredClone(state)
    });
    return id;
  }

  public countSaves(): number {
    return this.saves.length;
  }

  public loadLatest<T>(): T | null {
    const latest = this.saves[this.saves.length - 1];
    if (!latest) {
      return null;
    }
    return structuredClone(latest.state) as T;
  }

  public getStoragePath(): string {
    return this.dbPath;
  }
}
