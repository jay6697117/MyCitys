# V1 Verification Checklist

- [ ] `pnpm vitest` 全量通过
- [ ] `pnpm tsc --noEmit` 通过
- [ ] `pnpm tsx src/cli/run.ts` 可输出 1 tick 摘要
- [ ] `pnpm tsx src/cli/run.ts --seed 42 --ticks 5000` 无异常
- [ ] 胜负判定可复现（11 城吞并胜利 / CV 300 失败）
- [ ] 自动存档 10 分钟周期可验证
