---
name: /harness-go
description: Single-tick execution protocol for harness-go — one highest-priority action per invocation
---

# HARNESS-GO SPEC

定义 `/harness-go` 的单轮执行协议（"tick"）。每次调用做**一个**最高优先级动作。

本文件是完整规范，IDE 无关。任何 agent 收到 `/harness-go` 指令时按此文件严格执行。

不再调用 `superpowers:brainstorming` / `writing-plans`，改用本仓库自建 skill 族：

- [`docs/skills/harness/recon.md`](./harness/recon.md)
- [`docs/skills/harness/planning.md`](./harness/planning.md)
- [`docs/skills/harness/execute.md`](./harness/execute.md)
- [`docs/skills/harness/verify.md`](./harness/verify.md)

superpower 保留给**人工发起的离线重设计会话**；不进入 tick。

---

## 核心原则

- **串行 tick**：单次 chat 只做一件事；通过反复调用 `/harness-go` 推进。
- **一任务一 commit**：小任务直接在 main commit（轻量模式）；大任务才走分支+PR。
- **PR cap**：开放 PR ≥ 3 时不开新任务。
- **Checkpoint 驱动**：每轮结束更新 `docs/harness/checkpoint-now.md`，新 chat 可无缝恢复。
- **无 HARD-GATE**：tick 内不等用户逐问确认；需要人工决策时要显式**停 tick**并产出可审阅物（plan 文档 / PR）。

---

## 输入（Step 0 必读）

1. `docs/harness/checkpoint-now.md`
2. `docs/ROADMAP.md`
3. `docs/IDEAS-INBOX.md`
4. `gh pr list --search "label:status:needs-review,status:changes-requested,status:ready-to-merge,status:plan-approved" --json number,title,labels,headRefName`

---

## 优先级队列（Step 1：命中第一个就执行）

### P0 — 合并已批准 PR

条件：`status:ready-to-merge` + CI 绿。
动作：`gh pr merge --squash --delete-branch` → ROADMAP 标 `✅` → 更新 CHECKPOINT。

### P1 — 修复 changes_requested PR

条件：`status:changes-requested`。
动作：读 review → 修复（code 或 plan 均可）→ push → 标回 `status:needs-review`。

### P1.5 — 实现已批准的 plan

条件：`status:plan-approved`（你人工 review 过 plan 后手动换标）。
动作：`checkout` 该 PR 分支 → 调 `harness-execute` 按 plan 实现 → `harness-verify` → push → `gh pr ready`（若仍是 draft）→ 标 `status:needs-review`。

### P2 — 收件箱归入

条件：`IDEAS-INBOX.md` 有新行（对比 CHECKPOINT 已读行数）。
动作：提炼为任务 → **直接写入** ROADMAP `todo` → inbox 原行前加 `* ` → 更新 CHECKPOINT。
**P2 不消耗 tick**——完成后继续检查 P3。

### P3 — 执行下一个任务

前置：开放 PR < 3 且 ROADMAP 有 `todo`。

#### 3a. 选取

ROADMAP 执行队列中第一个 `todo` 任务。

#### 3b. 建 task 文档

按 `docs/harness/task-template.md` 创建 `docs/harness/task-<id>.md`，填写 A 节（目标/范围/验收条件）。

#### 3c. Recon（强制，tick 内，无用户交互）

调用 [`harness-recon`](./harness/recon.md)。产出：

- B 节方案对比（≥2 方案、推荐、取舍）
- **分歧度评分**：`low` / `medium` / `high`（规则见 recon skill）
- 若 recon 自身判定无法继续（验收标准缺、前置任务未做），**停 tick**，task 文档里说明下一步。

#### 3d. 执行模式判定

| 条件 | 模式 |
|------|------|
| 改动预计 ≤3 文件 且 `divergence=low` 且 未触碰硬约束 | **轻量模式**（main commit） |
| 其余 | **PR 模式** |

PR 模式再按分歧度分流：

| 分歧度 | PR 模式阶段 |
|--------|----------|
| `low` / `medium` | **单阶段**（本 tick 产出 plan + 实现 + ready PR） |
| `high` | **两阶段**（本 tick 仅产出 plan + draft PR，打 `status:needs-review`；等你审后换 `status:plan-approved`，由 P1.5 接力实现） |

#### 3e. 计划生成（仅 PR 模式）

调用 [`harness-planning`](./harness/planning.md)。

- 建分支 `harness/<task-id>`
- 产出 plan 到 `docs/superpowers/plans/YYYY-MM-DD-<task-id>.md`
  - 必要时同产 spec 到 `docs/superpowers/specs/YYYY-MM-DD-<task-id>-design.md`（范围广/有长期决策价值时）
- **单次合并 commit**（message 由 planning skill Step 8 决定）：
  - `high`：`docs: plan for <task-id> (#<pr-number>)`（PR 已建，含 PR 号回填到 ROADMAP/CHECKPOINT）
  - `low/medium`：`docs: plan for <task-id>`（此时未开 PR）
- push 分支 → `gh pr create --draft`（high 分歧，在 **commit 之前**以便回填 PR 号）或先暂不开 PR，等 3f 一起 ready（low/medium）
- task 文档 B 节只写「见 plan 文档」+ 分歧度

#### 3f. 执行分流

- **轻量模式**：调 `harness-execute` 按 B 节子步骤实现，main 分支频繁 commit。
- **PR 单阶段（low/medium）**：调 `harness-execute` 按 plan 顺序实现 → `gh pr create`（或 ready）→ 贴「未采纳备选方案」评论（格式见 planning skill）。
- **PR 两阶段（high）**：**不进入实现**。仅确认 plan PR 已 draft、label `status:needs-review`、ROADMAP 标 `👀`、CHECKPOINT 注明"等 plan review"，本 tick 到此为止。

#### 3g. 验证与收尾

调 [`harness-verify`](./harness/verify.md)：

```bash
pnpm test
pnpm --filter @openclaw-soul/web typecheck
pnpm --filter @openclaw-soul/web lint
```

填入 task 文档 D 节。

- **轻量模式**：commit → ROADMAP 标 `✅` → CHECKPOINT。
- **PR 单阶段**：push → `gh pr ready`（如原为 draft）→ `status:needs-review` → ROADMAP 标 `👀` → CHECKPOINT。
- **PR 两阶段**：3f 已停，不执行本步（plan PR 不需要跑 test）。
- **失败**：填 E 节 → 产出下一轮最小任务 → ROADMAP 标 `⚠️` → CHECKPOINT。

### P4 — 空闲

条件：无可执行动作。
动作：输出状态摘要，不做变更。

---

## 每 tick 结束输出（固定格式）

```markdown
## /harness-go tick 完成

**本轮动作**：<执行了什么，含模式/阶段/分歧度>

### 待你审阅
| PR | 任务 | 阶段 | 风险提示 |
|----|------|------|---------|

### 待你决策
- <最多 3 个；high 分歧 plan PR 放这里，提示换 `status:plan-approved`>

### 已完成
- <本轮完成的任务>

### 下一 tick 预告
- <下次会做什么（优先级命中哪一级）>

### PR cap 状态
- 开放 PR：N/3
```

---

## 分支与 PR 命名约定

| 元素 | 格式 | 示例 |
|------|------|------|
| 分支名 | `harness/<task-id>` | `harness/p2-r-1` |
| PR 标题 | `[Harness] <task-id>: <简述>` | `[Harness] P2-R-1: Header 控件左移` |
| Task 文档 | `docs/harness/task-<id>.md` | `docs/harness/task-p2-r-1.md` |
| Plan 文档 | `docs/superpowers/plans/YYYY-MM-DD-<task-id>.md` | `docs/superpowers/plans/2026-04-22-p2-r-1.md` |
| Spec 文档（可选） | `docs/superpowers/specs/YYYY-MM-DD-<task-id>-design.md` | — |

---

## 与 superpower 的关系

- `superpowers:brainstorming` / `writing-plans` / `subagent-driven-development` / `executing-plans` **不在 tick 内调用**。
- 保留用于：当你想对某个复杂任务**手动**走一次完整的 human-in-loop 设计会话（独立 chat，不用 `/harness-go`）。产物落到 `docs/superpowers/specs|plans/`，之后的 `/harness-go` 可通过 P3 推进（按现有 plan 跳过 planning skill 的方案对比阶段）或 P1.5 直接实现。
