---
name: harness-go
description: >-
  Executes the /harness-go autonomous task progression protocol. Use when the
  user message contains /harness-go, mentions harness tick, or asks to advance
  the harness execution queue.
---

# /harness-go — 自动推进协议

单轮执行协议（"tick"）。每次调用做 **一个** 最高优先级动作。

完整规范见 [`docs/HARNESS-GO-SPEC.md`](../../../docs/HARNESS-GO-SPEC.md)。

---

## Step 0 — 读取状态（不可跳过）

依次读取：

1. `docs/HARNESS-CHECKPOINT-NOW.md`
2. `docs/ROADMAP.md`
3. `docs/IDEAS-INBOX.md`

然后运行：

```bash
gh pr list --search "label:status:needs-review,status:changes-requested,status:ready-to-merge" --json number,title,labels,headRefName
```

---

## Step 1 — 按优先级执行第一个命中项

### P0 — 合并已批准 PR

- 条件：存在 `status:ready-to-merge` 且 CI 绿。
- 动作：`gh pr merge --squash --delete-branch` → ROADMAP 标 `✅` → 更新 CHECKPOINT。

### P1 — 修复 changes-requested PR

- 条件：存在 `status:changes-requested` 的 PR。
- 动作：读审阅意见 → 修复 → push → 标回 `status:needs-review` → 更新 CHECKPOINT。

### P2 — 收件箱归入

- 条件：`IDEAS-INBOX.md` 有新行（对比 CHECKPOINT 已读行数）。
- 动作：提炼为任务 → **直接写入** ROADMAP `todo` → inbox 原行前加 `* ` → 更新 CHECKPOINT。
- **P2 不消耗 tick**——完成后继续检查 P3。

### P3 — 执行下一个任务

- 前置：开放 PR < 3 且 ROADMAP 有 `todo`。
- **严格按以下子步骤执行：**

**3a. 选取**：ROADMAP 第一个 `todo` 任务。

**3b. 建 task 文档**：按 `docs/HARNESS-TASK-TEMPLATE.md` 创建 `docs/HARNESS-TASK-<ID>.md`，填 A 节。

**3c. Brainstorming（强制，不可跳过）**：调用 brainstorming skill，探索用户意图、现有代码结构、实现方案（≥2 备选）、风险。根据结论填 task 文档 B 节。

**3d. 判断执行模式**：
- **轻量模式**（默认）：一句话能说清 + 改动 ≤3 文件 + 无跨模块风险 → 直接在 main commit。
- **PR 模式**：跨模块 / 数据模型变更 / 有回滚风险 → 建分支 `harness/<id>` → 开 PR。

**3e. 实现**：按 B 节子步骤逐步执行，每步做局部验证。

**3f. 验证**：
```bash
pnpm test
pnpm --filter @openclaw-soul/web typecheck
pnpm --filter @openclaw-soul/web lint
```
填入 task 文档 D 节。

**3g. 收尾**：
- 轻量模式：commit → ROADMAP 标 `✅` → 更新 CHECKPOINT。
- PR 模式：push → `gh pr create --title "[Harness] <id>: <title>"` → `status:needs-review` → ROADMAP 标 `👀` → 更新 CHECKPOINT。

### P4 — 空闲

- 条件：无可执行动作。
- 动作：输出状态摘要，不做变更。

---

## Step 2 — 更新 CHECKPOINT + 输出摘要

更新 `docs/HARNESS-CHECKPOINT-NOW.md`：活跃任务表、已读行数、本轮动作、下一 tick。

### 输出格式（固定）

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

## 命名约定

| 元素 | 格式 | 示例 |
|------|------|------|
| 分支名 | `harness/<task-id>` | `harness/p2-g-1` |
| PR 标题 | `[Harness] <task-id>: <简述>` | `[Harness] P2-G-1: 登录入口整合` |
| Task 文档 | `docs/HARNESS-TASK-<ID>.md` | `docs/HARNESS-TASK-P2-G-1.md` |
