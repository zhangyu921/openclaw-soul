---
name: harness-planning
description: Tick 内生成可执行的 implementation plan，借鉴 superpowers:writing-plans 的文件映射 + bite-sized 子任务结构，但不拆多 chat、不要求 subagent-driven-development。
---

# HARNESS PLANNING

被 `/harness-go` 在 P3 的 **3e** 调用（仅 PR 模式）。输入是 `harness-recon` 的产物（task 文档 B 节 + 可选 mini-spec），输出是一份文件级别的 implementation plan，供 `harness-execute` 无歧义地一步步实现。

**和 `superpowers:writing-plans` 的关系**：

- **借鉴**：文件映射、bite-sized 步骤（2-5 分钟一步）、no placeholders、self-review checklist；
- **不用**：`subagent-driven-development` / `executing-plans` 的多 chat 节奏；plan 直接被主 agent 在同 tick 或下一 tick（P1.5）消费。

---

## 输入

- task 文档 `docs/harness/task-<id>.md`（B 节已含分歧度与方案对比）
- 可选 mini-spec `docs/superpowers/specs/YYYY-MM-DD-<task-id>-design.md`
- 当前分支：已 checkout 到 `harness/<task-id>`

## 输出

1. `docs/superpowers/plans/YYYY-MM-DD-<task-id>.md` — plan 主体（格式见下）
2. 首个 commit：`docs: plan for <task-id>`（只含 plan 与可选 spec）
3. PR：
   - `divergence=high` → `gh pr create --draft --title "[Harness] <task-id>: <简述>"`，label `status:needs-review`，PR body 顶部大字：「⚠️ 仅含 plan，分歧度 high，请先 review plan；确认后请把 label 改为 `status:plan-approved`」
   - `divergence=low/medium` → **不立即开 PR**，等 `harness-execute` 完成再一次开 ready PR

## 文件头模板

````markdown
# <任务标题> Implementation Plan

> **For agents running /harness-go:** 下一步由 `harness-execute` 按任务顺序执行；每完成一个 Task 做一次本地 commit。步骤用 `- [ ]` 跟踪。

**Goal:** <一句话>

**Architecture:** <2-3 句，说明总体拆解与关键依赖>

**Tech Stack:** <主要技术与 lib>

**Task 文档：** [`docs/harness/task-<id>.md`](../../harness/task-<id>.md)

**分歧度：** `low | medium | high`

**Spec（若有）：** [`../specs/YYYY-MM-DD-<task-id>-design.md`](../specs/YYYY-MM-DD-<task-id>-design.md)

---

## 文件映射（将创建 / 修改 / 删除）

| 路径 | 动作 | 作用 |
|------|------|------|
| `web/src/...` | Modify | … |
| `web/src/...` | Create | … |

---

## Task 1: <组件/步骤名>

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.tsx:123-145`
- Test: `exact/path/to/__tests__/file.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// 真实可运行的测试代码
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
pnpm -w test path/to/file.test.ts
```

- [ ] **Step 3: Implement**

```ts
// 真实可运行的实现代码
```

- [ ] **Step 4: Run the test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add <具体文件>
git commit -m "feat(web): <具体内容>"
```

---

## Task 2: …

…

---

## 未采纳的备选方案（贴 PR 评论用）

### 方案 B：<名称>
- **场景**：若 <条件> 成立则更合适
- **取舍**：<和推荐方案的差异一句话>
- **切换成本**：<文件数 / 风险等级>

### 方案 C：<名称>
…

---

## Self-Review Checklist

实施前 agent 自审一遍；不过关就改，不必再审一轮。

- [ ] 每个验收条件都能指向某个 Task
- [ ] 无 `TBD` / `后续补充` / `类似 Task N` 省略
- [ ] 类型/函数/路由名前后一致（Task 3 用 `foo()`，别的 Task 不得写 `fooAsync()`）
- [ ] 每个代码块是**完整可运行**的（不是伪代码）
- [ ] 每个 Task 结尾有 commit 步骤
- [ ] 硬约束未被绕过（`apply` 仅 rename/copy；不暗示自动脱敏；CLI 版本用 Changesets）
````

---

## 流程

### Step 1：读 recon 产物

确认 B 节推荐方案、分歧度、`alternatives_blocked_if_chosen`。

### Step 2：文件映射

先画文件映射表（上面的「文件映射」部分），把推荐方案拆成文件级别的改动清单。**不要**跳过这步直接写 Task——文件映射是 Task 边界的唯一依据。

原则：

- 一个 Task 只改**一组相关文件**（测试 + 实现 + 相邻调用点）
- 一个 Task 的 commit 必须独立可回滚
- 单个 Task 步骤数 ≤ 6

### Step 3：Bite-sized 子任务

每 Task 严格按 **TDD 五步**：写测试 → 跑（FAIL）→ 实现 → 跑（PASS）→ commit。

- 例外：纯文档 / 配置改动可省测试步骤，但 commit 步骤不能省
- 例外：Prisma migration 走 `pnpm exec prisma migrate dev --name ...` 代替测试跑

代码块必须是**真实可运行**的。禁止 `// TODO: fill in`。

### Step 4：未采纳方案清单

从 recon 的方案 B/C 抄过来，**补上触发条件**（"若你 review 后希望换 B"的具体场景）。这一段会被 `harness-execute` 在实现完成后作为 PR 评论贴出。

### Step 5：Self-review

按上面 checklist 自审。有问题**直接改**，不新写一轮。

### Step 6：落盘 + commit

- 写入 `docs/superpowers/plans/YYYY-MM-DD-<task-id>.md`
- `git add docs/superpowers/plans/... [docs/superpowers/specs/...]`
- `git commit -m "docs: plan for <task-id>"`

### Step 7：PR 分流（依 `divergence`）

- **high** → 立即 `gh pr create --draft --title "[Harness] <task-id>: <简述>" --body @-`，body 含：
  ```
  ⚠️ 仅含 plan，分歧度 high。
  请先 review plan；确认后将 label 改为 `status:plan-approved`，下一 /harness-go tick 会由 P1.5 接力实现。
  ```
  打 label `status:needs-review`，ROADMAP 标 `👀`。**harness-planning 到此返回 `stop`**，由 `/harness-go` 3f 处理停 tick。
- **low/medium** → 不开 PR，返回 `ok`，由 3f 继续调 `harness-execute`。

---

## 终态

- plan 落盘、已 commit
- 分支已建好
- high 分歧：draft PR 已建、label 已上、tick 即将终止
- low/medium 分歧：等 `harness-execute`

---

## 反模式（禁止）

- ❌ 省略文件映射直接写 Task
- ❌ 步骤里写 "add appropriate error handling" / "handle edge cases" 等空话
- ❌ 引用未定义的类型/函数
- ❌ Task 内代码前后不一致（名字、签名）
- ❌ 自作主张修改 recon 选定的推荐方案（要改就停 tick，回 3c 重做 recon）
- ❌ 把 low/medium 分歧硬拆成两阶段；low/medium 不开 draft PR
