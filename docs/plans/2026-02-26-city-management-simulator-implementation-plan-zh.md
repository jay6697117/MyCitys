# 纯城池经营策略模拟器 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于 `docs/plans/2026-02-26-city-management-simulator-design-zh.md` 落地一个可运行、可测试、可持续扩展的 v1 原型（无限经营、60 秒 Tick、12 城、三轨吞并、崩溃值败北）。

**Architecture:** 采用“核心模拟引擎 + 规则配置 + 持久化 + 命令接口 + 最小可视化看板”分层。领域规则全部写在 `src/domain` 与 `src/sim`，I/O 与存档放在 `src/infra`，避免规则被 UI 污染。以 TDD 驱动每个子系统，先写失败测试再写最小实现，保证可回归与可迭代平衡。

**Tech Stack:** TypeScript 5, Node.js 22, pnpm, Vitest, Zod, better-sqlite3, tsx

---

## 0) 执行前约束（必须遵守）

- 相关规格文档：`docs/plans/2026-02-26-city-management-simulator-design-zh.md`
- 开发计划文档（本文件）：`docs/plans/2026-02-26-city-management-simulator-implementation-plan-zh.md`
- 必用方法：@test-driven-development, @verification-before-completion, @systematic-debugging
- 提交策略：每个任务 1 次 commit，禁止大杂烩提交。
- 范围约束（YAGNI）：只做 v1 闭环，不做联网、不做复杂前端动画、不做多地图。

---

### Task 1: 项目骨架与测试基线

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `tests/smoke/bootstrap.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { bootstrap } from "../../src/index";

describe("bootstrap", () => {
  it("returns app metadata", () => {
    const meta = bootstrap();
    expect(meta.name).toBe("city-sim");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/smoke/bootstrap.spec.ts`
Expected: FAIL with module/function not found.

**Step 3: Write minimal implementation**

```ts
export function bootstrap() {
  return { name: "city-sim", version: "0.1.0" };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/smoke/bootstrap.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/index.ts tests/smoke/bootstrap.spec.ts
git commit -m "chore: bootstrap ts project with vitest baseline"
```

---

### Task 2: 12 城配置与分层规则

**Files:**
- Create: `src/domain/cities.ts`
- Create: `tests/domain/cities.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { CITIES, getCityTier } from "../../src/domain/cities";

describe("city config", () => {
  it("contains exactly 12 cities", () => {
    expect(CITIES).toHaveLength(12);
  });

  it("uses locked tiers", () => {
    expect(getCityTier("洛阳")).toBe("capital");
    expect(getCityTier("许昌")).toBe("core");
    expect(getCityTier("长安")).toBe("frontier");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/domain/cities.spec.ts`
Expected: FAIL with missing module.

**Step 3: Write minimal implementation**

实现 `CITIES` 常量（12 城）与 `getCityTier()`。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/domain/cities.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/cities.ts tests/domain/cities.spec.ts
git commit -m "feat: add fixed 12-city map and tier definitions"
```

---

### Task 3: 开局生成器（难度与归属规则）

**Files:**
- Create: `src/domain/newGame.ts`
- Create: `src/domain/types.ts`
- Create: `tests/domain/newGame.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createNewGame } from "../../src/domain/newGame";

describe("new game", () => {
  it("standard difficulty never starts on capital", () => {
    const game = createNewGame({ difficulty: "standard", seed: 42 });
    expect(game.playerCityTier).not.toBe("capital");
  });

  it("newbie starts as independent force", () => {
    const game = createNewGame({ difficulty: "newbie", seed: 7 });
    expect(game.playerAffiliation).toBe("independent");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/domain/newGame.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现难度规则：
- 新手/简单：可抽首都、核心、边城
- 标准/困难：仅核心、边城
- 新手/简单独立，标准/困难隶属三势力之一

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/domain/newGame.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/newGame.ts src/domain/types.ts tests/domain/newGame.spec.ts
git commit -m "feat: implement new game generation by difficulty rules"
```

---

### Task 4: 60 秒 Tick 核心时钟

**Files:**
- Create: `src/sim/tickEngine.ts`
- Create: `tests/sim/tickEngine.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createTickEngine } from "../../src/sim/tickEngine";

describe("tick engine", () => {
  it("advances exactly one world tick per 60s", () => {
    const engine = createTickEngine();
    engine.advance(60000);
    expect(engine.getState().ticks).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/tickEngine.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现固定步长时钟：内部以毫秒累计，满 60000 才加 1 tick。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/tickEngine.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/tickEngine.ts tests/sim/tickEngine.spec.ts
git commit -m "feat: add fixed 60-second simulation tick engine"
```

---

### Task 5: 资源生产/消耗结算

**Files:**
- Create: `src/sim/resourceSettlement.ts`
- Create: `tests/sim/resourceSettlement.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { settleResources } from "../../src/sim/resourceSettlement";

describe("resource settlement", () => {
  it("updates grain/gold/pop/security/armament each tick", () => {
    const next = settleResources({ grain: 100, gold: 100, population: 1000, security: 60, armament: 50 });
    expect(next.grain).not.toBe(100);
    expect(next.gold).not.toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/resourceSettlement.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现 v1 资源结算：生产 - 消耗 + 政策修正（先写简单线性模型）。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/resourceSettlement.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/resourceSettlement.ts tests/sim/resourceSettlement.spec.ts
git commit -m "feat: implement baseline resource settlement loop"
```

---

### Task 6: 治理三值与崩溃值（CV）

**Files:**
- Create: `src/sim/governanceSettlement.ts`
- Create: `tests/sim/governanceSettlement.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { settleGovernance } from "../../src/sim/governanceSettlement";

describe("governance settlement", () => {
  it("adds CV when security/morale low or corruption high", () => {
    const next = settleGovernance({ security: 30, morale: 30, corruption: 70, cv: 0 });
    expect(next.cv).toBeGreaterThan(0);
  });

  it("reduces CV when healthy", () => {
    const next = settleGovernance({ security: 75, morale: 75, corruption: 35, cv: 50 });
    expect(next.cv).toBeLessThan(50);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/governanceSettlement.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

按规格实现 CV 规则（阈值 40/20/60/80，CV 上限 300，健康回落 -15）。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/governanceSettlement.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/governanceSettlement.ts tests/sim/governanceSettlement.spec.ts
git commit -m "feat: implement governance and collapse value settlement"
```

---

### Task 7: 三轨吞并与 ISV 阈值

**Files:**
- Create: `src/sim/annexation.ts`
- Create: `tests/sim/annexation.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { applyAnnexationAction, isAnnexed } from "../../src/sim/annexation";

describe("annexation", () => {
  it("capital requires lower ISV threshold than frontier", () => {
    expect(isAnnexed("capital", -100)).toBe(true);
    expect(isAnnexed("capital", -50)).toBe(false);
    expect(isAnnexed("frontier", 0)).toBe(true);
  });

  it("action decreases ISV", () => {
    const next = applyAnnexationAction({ isv: 20, lane: "economic", power: 30, defense: 10 });
    expect(next.isv).toBeLessThan(20);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/annexation.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现三轨（经济/外交/战事）统一落到 `ISV` 的变更函数和分层判定。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/annexation.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/annexation.ts tests/sim/annexation.spec.ts
git commit -m "feat: add three-lane annexation and ISV threshold checks"
```

---

### Task 8: AI 每 Tick 最多 3 行动 + 动态优先级

**Files:**
- Create: `src/sim/aiPolicy.ts`
- Create: `tests/sim/aiPolicy.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { pickAiActions } from "../../src/sim/aiPolicy";

describe("ai policy", () => {
  it("returns at most 3 actions per tick", () => {
    const actions = pickAiActions({
      self: { deficit: true },
      target: { securityLow: true, moraleLow: true, corruptionHigh: true }
    });
    expect(actions.length).toBeLessThanOrEqual(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/aiPolicy.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现动态评分：按资源缺口、目标短板、关系状态计算三轨分值，取前 3。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/aiPolicy.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/aiPolicy.ts tests/sim/aiPolicy.spec.ts
git commit -m "feat: implement dynamic AI action selection with per-tick cap"
```

---

### Task 9: 官员系统（18 槽位、重排、忠诚与挖角）

**Files:**
- Create: `src/domain/officers.ts`
- Create: `tests/domain/officers.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { autoReassign, onPromotionFailure, canBePoached } from "../../src/domain/officers";

describe("officer system", () => {
  it("auto reassign respects locked officers", () => {
    const result = autoReassign({ lockedIds: ["A"], cooldownMinutes: 5 });
    expect(result.touchedLocked).toBe(false);
  });

  it("promotion failure reduces loyalty", () => {
    const next = onPromotionFailure({ loyalty: 60 });
    expect(next.loyalty).toBeLessThan(60);
  });

  it("low loyalty is poachable", () => {
    expect(canBePoached(25)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/domain/officers.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现：18 槽位约束、5 分钟自动重排冷却、锁定官员不重排、晋升失败降忠诚、低忠诚可挖角。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/domain/officers.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/officers.ts tests/domain/officers.spec.ts
git commit -m "feat: implement officer assignment, loyalty and poaching rules"
```

---

### Task 10: 倍速与惩罚（1x~10x，5x+惩罚）

**Files:**
- Create: `src/sim/timeScale.ts`
- Create: `tests/sim/timeScale.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getScalePenalty } from "../../src/sim/timeScale";

describe("time scale", () => {
  it("applies heavy penalty from 5x", () => {
    const p = getScalePenalty(5);
    expect(p.corruptionGrowthBonus).toBe(0.5);
    expect(p.fluctuationMultiplier).toBeGreaterThan(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/timeScale.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现倍率合法范围校验与分段惩罚（1x~4x 无惩罚，5x~10x 按配置放大）。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/timeScale.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/timeScale.ts tests/sim/timeScale.spec.ts
git commit -m "feat: implement timescale penalty model"
```

---

### Task 11: 自立、保护期、迁都规则

**Files:**
- Create: `src/domain/sovereignty.ts`
- Create: `tests/domain/sovereignty.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { canPeacefullyDeclareIndependence, getProtectionStatus, canRelocateCapital } from "../../src/domain/sovereignty";

describe("sovereignty", () => {
  it("standard difficulty can only use peaceful independence", () => {
    expect(canPeacefullyDeclareIndependence({ difficulty: "standard", prestige: 80, morale: 80, ransomPaid: true })).toBe(true);
  });

  it("protection lasts 20 minutes", () => {
    const s = getProtectionStatus({ elapsedMinutes: 10 });
    expect(s.active).toBe(true);
  });

  it("capital relocation has 60-minute cooldown", () => {
    expect(canRelocateCapital({ minutesSinceLastRelocation: 30 })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/domain/sovereignty.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现：和平自立条件、20 分钟保护期、提前结束双成本 + 轻反噬、迁都 60 分钟冷却。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/domain/sovereignty.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/sovereignty.ts tests/domain/sovereignty.spec.ts
git commit -m "feat: add sovereignty, protection window, and capital relocation rules"
```

---

### Task 12: 事件系统（5 分钟、权重、强制三选一）

**Files:**
- Create: `src/sim/events.ts`
- Create: `tests/sim/events.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { shouldTriggerEvent, buildEventChoices } from "../../src/sim/events";

describe("events", () => {
  it("triggers every 5 minutes", () => {
    expect(shouldTriggerEvent({ elapsedSeconds: 300 })).toBe(true);
  });

  it("always returns exactly 3 options", () => {
    expect(buildEventChoices({ security: 30, morale: 40, corruption: 70 })).toHaveLength(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/events.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现：5 分钟触发、状态权重随机、事件发生时标记“必须处理”。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/events.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/events.ts tests/sim/events.spec.ts
git commit -m "feat: implement weighted events with mandatory 3-choice resolution"
```

---

### Task 13: 存档系统（自动 10 分钟 + 手动）

**Files:**
- Create: `src/infra/saveRepository.ts`
- Create: `src/infra/schema.ts`
- Create: `tests/infra/saveRepository.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { SaveRepository } from "../../src/infra/saveRepository";

describe("save repository", () => {
  it("creates autosave every 10 minutes", () => {
    const repo = new SaveRepository(":memory:");
    repo.autoSaveIfDue({ elapsedMinutes: 10, state: { tick: 10 } });
    expect(repo.countSaves()).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/infra/saveRepository.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现 SQLite 存档表与自动/手动保存接口。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/infra/saveRepository.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/infra/saveRepository.ts src/infra/schema.ts tests/infra/saveRepository.spec.ts
git commit -m "feat: add autosave and manual save repository"
```

---

### Task 14: 胜负判定与结算出口

**Files:**
- Create: `src/sim/victory.ts`
- Create: `tests/sim/victory.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { evaluateOutcome } from "../../src/sim/victory";

describe("victory and defeat", () => {
  it("wins when all other 11 cities annexed", () => {
    const out = evaluateOutcome({ annexedCities: 11, capitalLost: false, cv: 0 });
    expect(out).toBe("victory");
  });

  it("defeats when cv reaches 300", () => {
    const out = evaluateOutcome({ annexedCities: 3, capitalLost: false, cv: 300 });
    expect(out).toBe("defeat");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/sim/victory.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

实现单点胜负判定函数，避免分散在多个模块。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/sim/victory.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/sim/victory.ts tests/sim/victory.spec.ts
git commit -m "feat: add centralized victory/defeat evaluator"
```

---

### Task 15: 最小可运行 CLI（便于快速验环）

**Files:**
- Create: `src/cli/run.ts`
- Modify: `src/index.ts`
- Create: `tests/smoke/runLoop.spec.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { runOneTick } from "../../src/cli/run";

describe("run loop", () => {
  it("returns updated summary after one tick", () => {
    const summary = runOneTick();
    expect(summary).toHaveProperty("tick");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/smoke/runLoop.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

写最小 CLI 驱动：初始化状态 -> 执行 1 tick -> 输出摘要。

**Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/smoke/runLoop.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli/run.ts src/index.ts tests/smoke/runLoop.spec.ts
git commit -m "feat: provide minimal runnable simulation loop entry"
```

---

### Task 16: 全量验证与发布前检查

**Files:**
- Modify: `README.md`
- Create: `docs/plans/checklists/v1-verification.md`

**Step 1: Write the failing test**

创建 `tests/smoke/integration.spec.ts`，断言“新局 -> 多 tick -> 胜负可达 -> 可存档读取”。

**Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/smoke/integration.spec.ts`
Expected: FAIL。

**Step 3: Write minimal implementation**

补齐缺失胶水代码，确保集成测试通过。

**Step 4: Run full verification**

Run:

```bash
pnpm vitest
pnpm tsc --noEmit
pnpm tsx src/cli/run.ts
```

Expected:
- `vitest`: all pass
- `tsc --noEmit`: exit 0
- `tsx src/cli/run.ts`: 输出 1 次 tick 摘要，不抛异常

**Step 5: Commit**

```bash
git add README.md docs/plans/checklists/v1-verification.md tests/smoke/integration.spec.ts
git commit -m "chore: add integration verification checklist and runbook"
```

---

## 回归顺序（每次改动后最少执行）

1. `pnpm vitest tests/domain/*.spec.ts`
2. `pnpm vitest tests/sim/*.spec.ts`
3. `pnpm vitest tests/infra/*.spec.ts`
4. `pnpm vitest tests/smoke/*.spec.ts`
5. `pnpm tsc --noEmit`

### 三道验证闸门（执行纪律）

1. Fast gate（当前切片）
   - 只跑当前任务测试，例如：`pnpm vitest tests/sim/annexation.spec.ts`
2. Pre-commit gate（提交前）
   - `pnpm vitest`
   - `pnpm tsc --noEmit`
3. Milestone gate（里程碑）
   - `pnpm vitest tests/smoke/integration.spec.ts`
   - `pnpm tsx src/cli/run.ts --seed 42 --ticks 5000`

### 固定种子不变量（Milestone gate 必查）

- 运行 5000 tick 过程中，资源数值不出现 `NaN`。
- 运行 5000 tick 过程中，`CV` 始终在 `[0, 300]` 区间。
- 任一城池仅在达到对应阈值后才可被吞并。
- AI 单 tick 行动数不超过 3。

---

## 风险清单与应对

- 数值发散：先锁区间再调系数，所有系数收敛到 `src/sim/constants.ts`。
- 规则冲突：以规格文档第 0 节优先级为准，冲突先改测试再改实现。
- AI 失控：先限制每 tick 3 行动，再调策略评分，禁止直接放开动作上限。
- 复杂度膨胀：新增规则必须附带失败测试与删减说明，避免“想加就加”。

---

## Definition of Done（DoD）

- [ ] 胜利与失败条件均可稳定复现
- [ ] 60 秒 Tick、5 分钟事件、10 分钟自动存档均可验证
- [ ] 12 城分层、三轨吞并、CV 机制与规格一致
- [ ] 全测试通过，类型检查通过
- [ ] README 含本地运行、测试、存档说明
