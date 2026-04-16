# HARNESS-GO SPEC

定义 `/harness-go` 的单轮执行协议（"tick"）。每次调用做**一个**最高优先级动作。

SKILL 文件 `.cursor/skills/harness-go/SKILL.md` 是模型侧的执行入口，本文件是完整规范。两者冲突时以本文件为准。

---

## 核心原则

- **串行 tick**：单次 chat 只做一件事；通过反复调用 `/harness-go` 推进。
- **一任务一 commit**：小任务直接在 main commit（轻量模式）；大任务才走分支+PR。
- **PR cap**：开放 PR ≥ 3 时不开新任务。
- **Checkpoint 驱动**：每轮结束更新 `docs/HARNESS-CHECKPOINT-NOW.md`，新 chat 可无缝恢复。

---

## 输入（Step 0 必读）

1. `docs/HARNESS-CHECKPOINT-NOW.md`
2. `docs/ROADMAP.md`
3. `docs/IDEAS-INBOX.md`
4. `gh pr list --search "label:status:needs-review,status:changes-requested,status:ready-to-merge" --json number,title,labels,headRefName`

---

## 优先级队列（Step 1：命中第一个就执行）

### P0 — 合并已批准 PR

条件：`status:ready-to-merge` + CI 绿。
动作：`gh pr merge --squash --delete-branch` → ROADMAP 标 `✅` → 更新 CHECKPOINT。

### P1 — 修复 changes_requested PR

条件：`status:changes-requested`。
动作：读 review → 修复 → push → 标回 `status:needs-review`。

### P2 — 收件箱归入

条件：`IDEAS-INBOX.md` 有新行（对比 CHECKPOINT 已读行数）。
动作：提炼为任务 → **直接写入** ROADMAP `todo` → inbox 原行前加 `* ` → 更新 CHECKPOINT。
**P2 不消耗 tick**——完成后继续检查 P3。

### P3 — 执行下一个任务

前置：开放 PR < 3 且 ROADMAP 有 `todo`。

#### 3a. 选取

ROADMAP 执行队列中第一个 `todo` 任务。

#### 3b. 建 task 文档

按 `docs/HARNESS-TASK-TEMPLATE.md` 创建 `docs/HARNESS-TASK-<ID>.md`，填写 A 节（目标/范围/验收条件）。

#### 3c. Brainstorming（强制）

**必须**调用 brainstorming skill，探索：
- 用户意图与验收标准
- 现有代码结构与复用点
- 实现方案（至少 2 个备选）
- 风险与边界

根据结论填写 task 文档 B 节（执行计划，3~5 步）。

#### 3d. 判断执行模式

- **轻量模式**（默认）：任务可用一句话描述、改动 ≤3 个文件、无跨模块风险 → 直接在 main commit。
- **PR 模式**：跨模块 / 涉及数据模型 / 有回滚风险 → 建分支 `harness/<id>` → 开 PR。

#### 3e. 实现

按 task 文档 B 节子步骤逐步实现。每步完成后做局部验证。

#### 3f. 验证

```bash
pnpm test
pnpm --filter @openclaw-soul/web typecheck
pnpm --filter @openclaw-soul/web lint
```

填入 task 文档 D 节。

#### 3g. 收尾

- **轻量模式**：commit → ROADMAP 标 `✅` → 更新 CHECKPOINT。
- **PR 模式**：push → `gh pr create` → `status:needs-review` → ROADMAP 标 `👀` → 更新 CHECKPOINT。

### P4 — 空闲

条件：无可执行动作。
动作：输出状态摘要，不做变更。

---

## 每 tick 结束输出（固定格式）

```markdown
## /harness-go tick 完成

**本轮动作**：<执行了什么>

### 待你审阅
| PR | 任务 | 风险提示 |
|----|------|---------|

### 待你决策
- <最多 3 个>

### 已完成
- <本轮完成的任务>

### 下一 tick 预告
- <下次会做什么>

### PR cap 状态
- 开放 PR：N/3
```

---

## 分支与 PR 命名约定

| 元素 | 格式 | 示例 |
|------|------|------|
| 分支名 | `harness/<task-id>` | `harness/p2-g-1` |
| PR 标题 | `[Harness] <task-id>: <简述>` | `[Harness] P2-G-1: 登录入口整合` |
| Task 文档 | `docs/HARNESS-TASK-<ID>.md` | `docs/HARNESS-TASK-P2-G-1.md` |
