# 纯城池经营策略模拟器

基于《三国群英传》内政闭环抽象出的纯城池经营策略模拟器原型。

## 本地运行

```bash
pnpm install

# 启动 Web UI (推荐)
# 访问 http://localhost:3000
pnpm dev

# 若 3000 端口被占用，改用其他端口
# 访问 http://localhost:3010
PORT=3010 pnpm dev

# 启动 CLI 版本
# 格式: pnpm dev:cli --seed <数> --ticks <数>
pnpm dev:cli --seed 42 --ticks 5000
```

## 运行测试

```bash
pnpm test
pnpm typecheck
```

## 存档说明

- 自动存档周期：10 分钟
- 手动存档：任意时刻可触发
- 当前实现使用仓库内 `SaveRepository` 接口做原型化管理

## Web 可玩会话接口

- `POST /api/session/new`：创建会话，参数示例 `{ "seed": 42, "difficulty": "standard" }`
- `GET /api/session/:id`：轮询会话快照（`snapshot`）
- `POST /api/session/:id/control`：控制会话（`paused` / `timeScale` / `stepTick`）
- `POST /api/session/:id/action`：执行动作（`annex` / `event` / `save`）

难度可选值：`newbie`、`easy`、`standard`、`hard`

吞并线路可选值：`economic`、`diplomatic`、`war`

## 规格与计划文档

- 规格文档：`docs/plans/2026-02-26-city-management-simulator-design-zh.md`
- 实施计划：`docs/plans/2026-02-26-city-management-simulator-implementation-plan-zh.md`
