import type { RuntimeState } from "../cli/run.js";
import { advanceOneTick, createInitialState } from "../cli/run.js";
import { CITIES } from "../domain/cities.js";
import { createNewGame } from "../domain/newGame.js";
import type { Affiliation, CityTier, Difficulty } from "../domain/types.js";
import { SaveRepository } from "../infra/saveRepository.js";
import { applyAnnexationAction, isAnnexed, TIER_THRESHOLD, type BattleOutcome } from "./annexation.js";
import {
  AUTOSAVE_INTERVAL_MINUTES,
  EVENT_INTERVAL_SECONDS,
  MAX_COLLAPSE_VALUE,
  TICK_MS
} from "./constants.js";
import { buildEventChoices, type EventChoice } from "./events.js";
import { pickAiActions } from "./aiPolicy.js";
import { getScalePenalty } from "./timeScale.js";
import { evaluateOutcome } from "./victory.js";

type CityOwner = "player" | "wei" | "shu" | "wu";

interface RuntimeCity {
  name: string;
  tier: CityTier;
  owner: CityOwner;
  isv: number;
  annexThreshold: number;
}

interface PendingEvent {
  id: string;
  title: string;
  choices: EventChoice[];
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface SessionSnapshot {
  session: {
    seed: number;
    difficulty: Difficulty;
    playerCityName: string;
    playerCityTier: CityTier;
    playerAffiliation: Affiliation;
    aiForces: Affiliation[];
    tick: number;
    elapsedSeconds: number;
    paused: boolean;
    timeScale: number;
    outcome: "ongoing" | "victory" | "defeat";
  };
  resources: RuntimeState["resources"];
  governance: RuntimeState["governance"] & { cvMax: number };
  conquest: {
    annexedCities: number;
    remainingCities: number;
    totalCities: number;
    victoryTarget: number;
  };
  cities: Array<{
    name: string;
    tier: CityTier;
    owner: CityOwner;
    isv: number;
    annexThreshold: number;
    isAnnexed: boolean;
  }>;
  event: {
    pending: boolean;
    id: string | null;
    title: string | null;
    choices: EventChoice[];
    nextInSeconds: number;
  };
  save: {
    count: number;
    lastAutoSaveMinute: number;
    autoSaveIntervalMinutes: number;
  };
  rules: {
    tickSeconds: number;
    eventIntervalSeconds: number;
    autoSaveIntervalMinutes: number;
    cvMax: number;
    timeScaleRange: readonly [number, number];
    tierThreshold: {
      frontier: number;
      core: number;
      capital: number;
    };
  };
  logs: string[];
  fullState: RuntimeState;
}

const AI_FORCE_CYCLE: CityOwner[] = ["wei", "shu", "wu"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function baseIsvByTier(tier: CityTier): number {
  if (tier === "capital") {
    return 60;
  }
  if (tier === "core") {
    return 40;
  }
  return 20;
}

function resolveWarOutcome(diff: number): BattleOutcome {
  if (diff >= 30) {
    return "majorWin";
  }
  if (diff >= 10) {
    return "minorWin";
  }
  if (diff <= -20) {
    return "majorLose";
  }
  if (diff <= -5) {
    return "minorLose";
  }
  return "draw";
}

export class GameSession {
  private runtimeState: RuntimeState;
  private readonly saveRepository = new SaveRepository(":memory:");
  private readonly logs: string[] = [];
  private readonly seed: number;
  private readonly playerCityName: string;
  private readonly playerCityTier: CityTier;
  private readonly playerAffiliation: Affiliation;
  private readonly aiForces: Affiliation[];
  private cities: RuntimeCity[];
  private elapsedSeconds = 0;
  private accumulatorSeconds = 0;
  private nextEventCountdownSeconds = EVENT_INTERVAL_SECONDS;
  private lastAutoSaveMinute = 0;
  private timeScale = 1;
  private paused = false;
  private outcome: "ongoing" | "victory" | "defeat" = "ongoing";
  private pendingEvent: PendingEvent | null = null;

  public constructor(seed = 42, difficulty: Difficulty = "standard") {
    this.seed = seed;
    const setup = createNewGame({ seed, difficulty });
    this.playerCityName = setup.playerCityName;
    this.playerCityTier = setup.playerCityTier;
    this.playerAffiliation = setup.playerAffiliation;
    this.aiForces = setup.aiForces;
    this.runtimeState = createInitialState(seed, difficulty);
    this.cities = this.buildCities();
    this.recalculateAnnexedCities();
    this.pushLog(`新战局开始: 难度=${difficulty} 主城=${setup.playerCityName}`);
  }

  private buildCities(): RuntimeCity[] {
    let forceCursor = 0;
    return CITIES.map((city) => {
      if (city.name === this.playerCityName) {
        return {
          name: city.name,
          tier: city.tier,
          owner: "player",
          isv: Math.max(70, baseIsvByTier(city.tier)),
          annexThreshold: TIER_THRESHOLD[city.tier]
        };
      }

      const owner = AI_FORCE_CYCLE[forceCursor % AI_FORCE_CYCLE.length] as CityOwner;
      forceCursor += 1;
      return {
        name: city.name,
        tier: city.tier,
        owner,
        isv: baseIsvByTier(city.tier),
        annexThreshold: TIER_THRESHOLD[city.tier]
      };
    });
  }

  private pushLog(message: string): void {
    this.logs.unshift(`${new Date().toLocaleTimeString("zh-CN", { hour12: false })} ${message}`);
    if (this.logs.length > 40) {
      this.logs.length = 40;
    }
  }

  private recalculateAnnexedCities(): void {
    this.runtimeState.annexedCities = this.cities.filter(
      (city) => city.owner === "player" && city.name !== this.playerCityName
    ).length;
  }

  private evaluateOutcomeAndStopIfNeeded(): void {
    this.recalculateAnnexedCities();
    this.outcome = evaluateOutcome({
      annexedCities: this.runtimeState.annexedCities,
      capitalLost: this.runtimeState.capitalLost,
      cv: this.runtimeState.governance.cv
    });

    if (this.outcome !== "ongoing") {
      this.paused = true;
      if (this.outcome === "victory") {
        this.pushLog("你已统一其余城池，获得胜利。");
      } else {
        this.pushLog("主城崩溃或失守，战局失败。");
      }
    }
  }

  private applyHighSpeedPenalty(): void {
    const penalty = getScalePenalty(this.timeScale);
    if (penalty.corruptionGrowthBonus <= 0 && penalty.fluctuationMultiplier <= 1) {
      return;
    }

    this.runtimeState.governance.security = clamp(
      this.runtimeState.governance.security - Math.round((penalty.fluctuationMultiplier - 1) * 3),
      0,
      100
    );
    this.runtimeState.governance.morale = clamp(
      this.runtimeState.governance.morale - Math.round((penalty.fluctuationMultiplier - 1) * 3),
      0,
      100
    );
    this.runtimeState.governance.corruption = clamp(
      this.runtimeState.governance.corruption + Math.round(penalty.corruptionGrowthBonus * 4),
      0,
      100
    );
  }

  private applyAiPressure(): void {
    const context = {
      self: {
        deficit: this.runtimeState.resources.gold < 400,
        militaryReady: this.runtimeState.resources.armament > 40,
        diplomaticLeverage: this.runtimeState.governance.morale > 55
      },
      target: {
        securityLow: this.runtimeState.governance.security < 50,
        moraleLow: this.runtimeState.governance.morale < 50,
        corruptionHigh: this.runtimeState.governance.corruption > 50
      },
      relation: "hostile" as const
    };

    const actions = pickAiActions(context).slice(0, 3);
    for (const action of actions) {
      if (action.lane === "economic") {
        this.runtimeState.resources.gold = Math.max(0, this.runtimeState.resources.gold - 20);
        this.runtimeState.resources.grain = Math.max(0, this.runtimeState.resources.grain - 30);
      } else if (action.lane === "diplomatic") {
        this.runtimeState.governance.morale = clamp(this.runtimeState.governance.morale - 2, 0, 100);
      } else {
        this.runtimeState.resources.armament = clamp(this.runtimeState.resources.armament - 2, 0, 100);
        this.runtimeState.governance.security = clamp(this.runtimeState.governance.security - 2, 0, 100);
      }
    }
  }

  private runOneSettlementTick(): void {
    this.runtimeState = advanceOneTick(this.runtimeState);
    this.applyHighSpeedPenalty();
    this.applyAiPressure();
    this.runtimeState.governance.cv = clamp(this.runtimeState.governance.cv, 0, MAX_COLLAPSE_VALUE);
    this.recalculateAnnexedCities();
    this.evaluateOutcomeAndStopIfNeeded();
  }

  private triggerEventWhenReady(): void {
    if (this.pendingEvent || this.outcome !== "ongoing") {
      return;
    }
    if (this.nextEventCountdownSeconds > 0) {
      return;
    }

    const choices = buildEventChoices({
      security: this.runtimeState.governance.security,
      morale: this.runtimeState.governance.morale,
      corruption: this.runtimeState.governance.corruption
    });

    this.pendingEvent = {
      id: `event-${this.runtimeState.tick}`,
      title: `突发事件 ${this.runtimeState.tick}`,
      choices
    };
    this.nextEventCountdownSeconds = EVENT_INTERVAL_SECONDS;
    this.paused = true;
    this.pushLog("触发随机事件，系统暂停，需先处理事件。");
  }

  private runAutoSaveWhenDue(): void {
    const elapsedMinutes = Math.floor(this.elapsedSeconds / 60);
    const didSave = this.saveRepository.autoSaveIfDue({
      elapsedMinutes,
      state: this.getSnapshot()
    });
    if (didSave) {
      this.lastAutoSaveMinute = elapsedMinutes;
    }
  }

  public advanceWallClock(realSeconds = 1): void {
    if (this.outcome !== "ongoing" || this.paused) {
      return;
    }

    const scaledSeconds = Math.max(0, realSeconds) * this.timeScale;
    this.elapsedSeconds += scaledSeconds;
    this.accumulatorSeconds += scaledSeconds;
    this.nextEventCountdownSeconds -= scaledSeconds;

    while (this.accumulatorSeconds >= TICK_MS / 1000) {
      this.accumulatorSeconds -= TICK_MS / 1000;
      this.runOneSettlementTick();
      if (this.outcome !== "ongoing") {
        break;
      }
    }

    this.triggerEventWhenReady();
    this.runAutoSaveWhenDue();
  }

  public setPaused(value: boolean): ActionResult {
    if (this.outcome !== "ongoing") {
      return { ok: false, message: "战局已结束，无法修改暂停状态。" };
    }
    this.paused = value;
    this.pushLog(value ? "已手动暂停。" : "已恢复运行。");
    return { ok: true, message: value ? "已暂停" : "已恢复" };
  }

  public setTimeScale(scale: number): ActionResult {
    if (!Number.isInteger(scale) || scale < 1 || scale > 10) {
      return { ok: false, message: "倍率必须在 1x 到 10x 之间。" };
    }
    this.timeScale = scale;
    this.pushLog(`时间倍率设为 ${scale}x。`);
    return { ok: true, message: `倍率已切换到 ${scale}x` };
  }

  public manualAdvanceTick(): ActionResult {
    if (this.outcome !== "ongoing") {
      return { ok: false, message: "战局已结束，无法推进。" };
    }
    if (this.pendingEvent) {
      return { ok: false, message: "请先处理当前事件。" };
    }

    this.elapsedSeconds += TICK_MS / 1000;
    this.nextEventCountdownSeconds -= TICK_MS / 1000;
    this.runOneSettlementTick();
    this.triggerEventWhenReady();
    this.runAutoSaveWhenDue();
    this.pushLog("手动推进了 1 Tick。");
    return { ok: true, message: "已推进 1 Tick" };
  }

  public resolveEvent(choiceId: string): ActionResult {
    if (!this.pendingEvent) {
      return { ok: false, message: "当前没有待处理事件。" };
    }

    const selected = this.pendingEvent.choices.find((choice) => choice.id === choiceId);
    if (!selected) {
      return { ok: false, message: "事件选项无效。" };
    }

    this.runtimeState.governance.security = clamp(
      this.runtimeState.governance.security + selected.impact.security,
      0,
      100
    );
    this.runtimeState.governance.morale = clamp(
      this.runtimeState.governance.morale + selected.impact.morale,
      0,
      100
    );
    this.runtimeState.governance.corruption = clamp(
      this.runtimeState.governance.corruption + selected.impact.corruption,
      0,
      100
    );

    this.pendingEvent = null;
    this.paused = false;
    this.pushLog(`事件处理完成: ${selected.label}`);
    this.evaluateOutcomeAndStopIfNeeded();
    return { ok: true, message: `已选择 ${selected.label}` };
  }

  public performAnnexAction(lane: "economic" | "diplomatic" | "war", cityName: string): ActionResult {
    if (this.outcome !== "ongoing") {
      return { ok: false, message: "战局已结束，无法继续行动。" };
    }
    if (this.pendingEvent) {
      return { ok: false, message: "请先处理当前事件。" };
    }

    const city = this.cities.find((item) => item.name === cityName);
    if (!city) {
      return { ok: false, message: "目标城池不存在。" };
    }
    if (city.owner === "player") {
      return { ok: false, message: "该城已在你控制之下。" };
    }

    if (lane === "economic") {
      if (this.runtimeState.resources.gold < 120 || this.runtimeState.resources.grain < 140) {
        return { ok: false, message: "金粮不足，无法执行经济压制。" };
      }
      this.runtimeState.resources.gold -= 120;
      this.runtimeState.resources.grain -= 140;
    } else if (lane === "diplomatic") {
      if (this.runtimeState.resources.gold < 150 || this.runtimeState.resources.population < 50) {
        return { ok: false, message: "金或人口不足，无法执行外交并吞。" };
      }
      this.runtimeState.resources.gold -= 150;
      this.runtimeState.resources.population = Math.max(1, this.runtimeState.resources.population - 40);
    } else {
      if (this.runtimeState.resources.armament < 20 || this.runtimeState.resources.grain < 100) {
        return { ok: false, message: "军备或粮草不足，无法执行自动战事。" };
      }
      this.runtimeState.resources.armament -= 20;
      this.runtimeState.resources.grain -= 100;
    }

    const defenseBase = city.tier === "capital" ? 60 : city.tier === "core" ? 42 : 26;
    const defense = defenseBase + 10;

    let power: number;
    let battleOutcome: BattleOutcome | undefined;
    if (lane === "economic") {
      power =
        this.runtimeState.resources.gold / 30 +
        this.runtimeState.resources.grain / 80 +
        this.runtimeState.governance.morale / 2;
    } else if (lane === "diplomatic") {
      power =
        this.runtimeState.governance.morale +
        this.runtimeState.resources.population / 80 -
        this.runtimeState.governance.corruption / 2;
    } else {
      power = this.runtimeState.resources.armament + this.runtimeState.governance.security * 1.5;
      battleOutcome = resolveWarOutcome(power - defense);
    }

    const result = applyAnnexationAction({
      isv: city.isv,
      lane,
      power,
      defense,
      battleOutcome
    });
    city.isv = result.isv;

    if (isAnnexed(city.tier, city.isv)) {
      city.owner = "player";
      this.pushLog(`成功吞并 ${city.name}（${lane}）。`);
    } else {
      this.pushLog(`${lane} 行动命中 ${city.name}，ISV变化 ${Math.round(result.delta)}。`);
    }

    this.evaluateOutcomeAndStopIfNeeded();
    return { ok: true, message: `${city.name} 行动完成` };
  }

  public manualSave(): ActionResult {
    const id = this.saveRepository.manualSave(this.getSnapshot());
    this.pushLog(`手动存档完成（ID=${id}）。`);
    return { ok: true, message: `存档成功 #${id}` };
  }

  public getSnapshot(): SessionSnapshot {
    const cities = this.cities.map((city) => ({
      name: city.name,
      tier: city.tier,
      owner: city.owner,
      isv: city.isv,
      annexThreshold: city.annexThreshold,
      isAnnexed: city.owner === "player" && city.name !== this.playerCityName
    }));

    return {
      session: {
        seed: this.seed,
        difficulty: this.runtimeState.difficulty,
        playerCityName: this.playerCityName,
        playerCityTier: this.playerCityTier,
        playerAffiliation: this.playerAffiliation,
        aiForces: this.aiForces,
        tick: this.runtimeState.tick,
        elapsedSeconds: Math.floor(this.elapsedSeconds),
        paused: this.paused,
        timeScale: this.timeScale,
        outcome: this.outcome
      },
      resources: {
        ...this.runtimeState.resources
      },
      governance: {
        ...this.runtimeState.governance,
        cvMax: MAX_COLLAPSE_VALUE
      },
      conquest: {
        annexedCities: this.runtimeState.annexedCities,
        remainingCities: 11 - this.runtimeState.annexedCities,
        totalCities: 12,
        victoryTarget: 11
      },
      cities,
      event: {
        pending: Boolean(this.pendingEvent),
        id: this.pendingEvent?.id ?? null,
        title: this.pendingEvent?.title ?? null,
        choices: this.pendingEvent?.choices ?? [],
        nextInSeconds: Math.max(0, Math.ceil(this.nextEventCountdownSeconds))
      },
      save: {
        count: this.saveRepository.countSaves(),
        lastAutoSaveMinute: this.lastAutoSaveMinute,
        autoSaveIntervalMinutes: AUTOSAVE_INTERVAL_MINUTES
      },
      rules: {
        tickSeconds: TICK_MS / 1000,
        eventIntervalSeconds: EVENT_INTERVAL_SECONDS,
        autoSaveIntervalMinutes: AUTOSAVE_INTERVAL_MINUTES,
        cvMax: MAX_COLLAPSE_VALUE,
        timeScaleRange: [1, 10] as const,
        tierThreshold: {
          frontier: TIER_THRESHOLD.frontier,
          core: TIER_THRESHOLD.core,
          capital: TIER_THRESHOLD.capital
        }
      },
      logs: [...this.logs],
      fullState: {
        ...this.runtimeState
      }
    };
  }
}
