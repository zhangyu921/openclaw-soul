# HARNESS CHECKPOINT NOW

用途：在新对话里快速恢复上下文，避免重复解释。

更新日期：2026-04-14

---

## 1) 当前目标（单轮）

- 进入 harness 执行阶段（不是再做流程设计）
- 本轮任务上限：2（必要时降到 1）
- 只认以下真源：
  - `docs/ROADMAP.md`
  - `docs/HARNESS-TASK-*.md`
  - PR labels（`status:*`）

---

## 2) 当前执行队列（Wave 1）

### Task A — `P2-E-1`

- **标题**：Header 品牌与首屏视觉最小改造
- **文档**：`docs/HARNESS-TASK-P2-E-1.md`
- **状态**：`done`（roadmap 标记 `✅`）
- **验收关键点**：
  - Hero/Header 品牌视觉增强可见
  - 不破坏登录/导航/多语言
  - 通过 lint/typecheck/test/smoke（按改动范围）

### Task B — `P2-F-1`

- **标题**：画廊检索 MVP（关键词 + 标签）
- **文档**：`docs/HARNESS-TASK-P2-F-1.md`
- **状态**：`todo`（roadmap 留空，延期；后续按数据库检索方案重启）
- **验收关键点**：
  - 关键词搜索可用
  - 标签筛选可用（最小兼容策略）
  - 搜索与筛选可组合且结果可预期

---

## 3) 已完成的 harness 基建

- 流程与模板：
  - `docs/HARNESS-WORKFLOW.md`
  - `docs/HARNESS-TASK-TEMPLATE.md`
  - `docs/HARNESS-STATE-MACHINE.md`
  - `docs/HARNESS-GO-SPEC.md`
- 输入收件箱：
  - `docs/IDEAS-INBOX.md`（一行一条自由输入）
- 审阅模板：
  - `.github/pull_request_template.md`
- CI 守门（已接入）：
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm e2e:smoke`
- Auth smoke 已覆盖成功/失败核心链路（GitHub + email-code 相关）

---

## 4) 协作规则（给新对话）

1. 不要先扩 scope；先执行 Wave 1。
2. 每个任务先建/更新 task 文档，再动代码。
3. 每个任务完成后必须给：
   - 改动摘要
   - 验证证据
   - 风险与回滚
4. 到 `needs_review` 再开 PR。
5. 任何路径优化（>=30% 收益）先暂停并提方案让用户决策。

---

## 5) 新对话启动语句（可直接复制）

“请先读取 `docs/HARNESS-CHECKPOINT-NOW.md`、`docs/ROADMAP.md`、`docs/HARNESS-TASK-P2-E-1.md`、`docs/HARNESS-TASK-P2-F-1.md`。  
只执行 Wave 1，不新增任务。先从 `P2-E-1` 开始（或我指定的任务），完成后输出：变更摘要、验证证据、风险与回滚，再等待我审阅。”
