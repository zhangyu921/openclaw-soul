---
name: harness-execute
description: 按 plan（或 task B 节子步骤）实现代码；频繁 commit；发现超纲立即停 tick 回 recon。替代 superpowers:executing-plans / subagent-driven-development。
---

# HARNESS EXECUTE

被 `/harness-go` 调用的场景：

- P3 轻量模式 · 3f：直接按 task 文档 B 节子步骤实现
- P3 PR 单阶段（low/medium）· 3f：按 plan 文档顺序实现
- **P1.5**：当 PR 有 `status:plan-approved` label 时 checkout 分支后调用本 skill 按 plan 实现

---

## 输入

- **轻量模式**：`docs/harness/task-<id>.md`（B 节子步骤）
- **PR 模式**：`docs/superpowers/plans/YYYY-MM-DD-<task-id>.md` + 对应 task 文档

## 输出

- 每个 Task（或轻量模式的每个子步骤）一个 commit
- task 文档 C 节已填（实际改动文件、关键实现说明、硬约束对齐）
- 返回 `ok`（进 3g 验证）或 `stop`（发现超纲 / 不确定 → 回报）

---

## 流程

### Step 0：对齐输入

- 轻量模式：在 main 分支，确认 `git status` 干净
- PR 模式：`git checkout harness/<task-id>`；若首次，先从 main `git switch -c harness/<task-id>`（planning skill 若已建好则直接 checkout）

### Step 1：逐 Task 执行

对 plan（或 B 节子步骤）的每一个 Task / 步骤：

1. **完整读完**该 Task 所有子步骤再动手（不允许边读边改）
2. 严格按 Step 顺序执行；TDD 五步不跳
3. 代码块就是源码——不要二次创造（除非发现 plan 有明显错误，见 Step 3）
4. **每个 Task 结尾必须 commit**；commit message 用 plan 里写好的
5. 每个 Task 之间不合并 commit；保留颗粒度便于 review

### Step 2：TDD 守则

测试必须先写后跑，先失败再成功。**禁止**先写实现再补测试。

例外（不需要测试的 Task，plan 里应已说明）：

- 纯 markdown / 配置 / i18n 文案改动
- Prisma schema（用 `prisma migrate dev` 代替）
- 依赖升级 / lockfile
- Task 只负责删除死代码

其余所有 Task **必须**含测试 Step。

### Step 3：超纲检测

**任一**下列情况出现 → **立即停 tick**：

| 情况 | 处置 |
|------|------|
| Plan 的代码块无法直接运行（类型错、import 缺、命名冲突） | `git reset --hard` 丢弃已写但未 commit 的改动；回报 planning skill 需重写；tick 结束 |
| 实现过程中发现新的文件需要改但 plan 未列 | 回退本 Task 已写内容；在 task 文档 E 节写明新增文件与原因；tick 结束 |
| 发现推荐方案的某验收条件无法满足 | 同上；在 E 节写明「需回 recon 重选方案」；tick 结束 |
| 触碰硬约束（`apply` 破坏删除、CLI 版本手改、MEMORY.md 脱敏文案） | 立即 `git reset --hard`；tick 结束；不 commit |

**禁止**在本 skill 内"顺手"扩大改动范围。发现偏差就退回去。

### Step 4：C 节回填

所有 Task 完成后（尚未跑验证），回填 task 文档 C 节：

```markdown
## C. 实施记录（Implementation Log）

- **实际改动文件**：
  - `path/a.ts`
  - `path/b.tsx`
  - ...
- **关键实现说明（为什么这样做）**：<1-3 句，点出 plan 之外的判断>
- **与硬约束对齐说明**：
  - `apply` 写配置未触发破坏性删除
  - 未暗示自动脱敏
```

这步不单独 commit；和 Step 5 一起进。

### Step 5：收尾 commit

- 轻量模式：所有代码 commit 已做完；C 节回填作为最后一个 commit：`git commit -m "docs: task-<id> C 节实施记录"`
- PR 模式：同上

### Step 6：PR 评论（仅 PR 单阶段）

从 plan 的「未采纳的备选方案」章节抄出来，作为 PR 的一条评论（**不**写进 PR body，避免 review 噪声）：

```bash
gh pr comment <pr-number> --body "$(cat <<'EOF'
## 未采纳的备选方案（供 review 参考）

### 方案 B：<名称>
- 场景：若 <条件> 成立则更合适
- 取舍：<差异>
- 切换成本：<文件数 / 风险等级>

### 方案 C：...
EOF
)"
```

P1.5 模式同样贴（因为 plan PR 评论区也没见过代码；现在代码到位了，再贴一次便于 review 对照）。

---

## 终态

- 所有 Task 已 commit
- task 文档 C 节已填
- （PR 模式）已贴备选方案评论（PR 可能还是 draft，`gh pr ready` 由 3g 做）
- 返回 `ok`

---

## 反模式（禁止）

- ❌ 先写实现再补测试（除 Step 2 的白名单例外）
- ❌ 发现 plan 错误就"聪明地"自行调整 — 必须停 tick 回报
- ❌ 一个 Task 拖进下一个 Task 混合 commit
- ❌ 跳过 C 节回填直接进验证
- ❌ 在本 skill 里做计划外重构（哪怕很小）
- ❌ 调用任何 superpower skill / subagent
