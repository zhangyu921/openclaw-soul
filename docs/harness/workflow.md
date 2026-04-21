# HARNESS WORKFLOW

> **已迁移到 `/harness-go` 协议 + 自建 skill 族**。
>
> 本文件原为 MVP 规范，自 2026-04 起被以下文档取代，保留仅作历史参考。

## 当前规范入口

- **单轮协议**：[`docs/skills/harness-go.md`](../skills/harness-go.md)
- **Skill 族**：
  - [`harness-recon`](../skills/harness/recon.md) — P3 3c：代码侦察 + 方案对比 + 分歧度评分
  - [`harness-planning`](../skills/harness/planning.md) — P3 3e：PR 模式下生成 implementation plan
  - [`harness-execute`](../skills/harness/execute.md) — P3 3f / P1.5：按 plan 或 B 节实现
  - [`harness-verify`](../skills/harness/verify.md) — P3 3g / P1.5：跑测试并填证据/失败回流
- **状态机**：[`docs/harness/state-machine.md`](./state-machine.md)
- **Task 模板**：[`docs/harness/task-template.md`](./task-template.md)
- **Checkpoint**：[`docs/harness/checkpoint-now.md`](./checkpoint-now.md)

## 和 `superpowers:*` 的分工

- **tick 内不再调用** superpower skill（brainstorming / writing-plans / executing-plans / subagent-driven-development）。
- superpower 仅用于**人工发起**的离线重设计会话（独立 chat，不走 `/harness-go`）。产物落 `docs/superpowers/specs|plans/`，之后由 `/harness-go` 的 P1.5 或 P3 接力实现。

## 硬约束（仍然适用）

- `apply` / 写配置：只允许 rename / copy 备份，禁止对用户目录破坏性删除。
- 不得暗示 zip 内容已自动脱敏。
- CLI 发版：只用 Changesets，勿手改 version / CHANGELOG。

（详见根目录 [`AGENTS.md`](../../AGENTS.md)。）
