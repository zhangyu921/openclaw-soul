---
name: harness-verify
description: Tick 末的验证入口：跑 test / typecheck / lint，填 task 文档 D 节；失败时产出可直接执行的下一轮最小任务（E 节）。
---

# HARNESS VERIFY

被 `/harness-go` 在 P3 的 **3g** 调用（PR 单阶段与轻量模式），以及 P1.5 实现完成后调用。

职责单一：**跑验证 → 填证据 → 失败时回流为下一轮任务**。不改代码、不开 PR、不改 label——那些由 `/harness-go` 3g 正文处理。

---

## 输入

- 当前分支已完成实现（代码已 commit）
- task 文档 `docs/harness/task-<id>.md`（C 节已填）

## 输出

- task 文档 D 节已填（测试命令 + 结论）
- 若失败：E 节已填 + 下一轮最小任务已在 ROADMAP / IDEAS-INBOX 就位
- 返回 `ok` / `fail`

---

## 标准验证命令

```bash
pnpm test
pnpm --filter @openclaw-soul/web typecheck
pnpm --filter @openclaw-soul/web lint
```

可选（按改动面追加）：

| 改动面 | 追加命令 |
|------|------|
| CLI (`packages/cli`) | `pnpm --filter @openclaw-soul/cli test`（若有）；`pnpm run ocs -- <关键子命令>` 关键路径 smoke |
| Prisma schema | `pnpm --filter @openclaw-soul/web exec prisma validate` |
| i18n 文案 | 运行 dev server 人工过一遍关键页面（或在 D 节说明跳过原因） |
| 构建路径 | `pnpm --filter @openclaw-soul/web build` |

命令失败时**不要**加 `|| true` 绕过。

---

## 流程

### Step 0：生成物预热（按改动面触发）

**标准命令之前**先跑，避免因缺生成物把 typecheck 判成"失败"：

| 若本 task 改动了 | 先跑 |
|------|------|
| `web/prisma/schema.prisma`（或同 task 跑过 `prisma migrate dev`） | `pnpm --filter @openclaw-soul/web exec prisma generate` |
| 新增依赖（`package.json` / `pnpm-lock.yaml`） | `pnpm install --frozen-lockfile`（本地可 `pnpm install`） |
| 新增 / 改 i18n key 且项目有类型生成步骤 | 按项目约定重生成类型 |

此步是**基础设施预热**，不算验证本身，失败则视同 Step 3b 的**基础设施型失败**（见下）。

### Step 1：跑标准命令

依次跑三条标准命令，记录 stdout 最后 20 行到一个临时变量。

### Step 2：填 D 节

```markdown
## D. 验收证据（Verification Evidence）

- **基础设施预热**（仅当 Step 0 或 Step 3b 白名单触发时填；否则整行删除）：
  - <例：首次 typecheck 因 schema 改动缺生成物失败；跑 `pnpm --filter @openclaw-soul/web exec prisma generate` 后通过>
- **测试命令与结论**：
  - `pnpm test`：通过 / 未通过（<简述失败项>）
  - `pnpm --filter @openclaw-soul/web typecheck`：通过 / 未通过
  - `pnpm --filter @openclaw-soul/web lint`：通过 / 未通过
- **子系统验证**（按改动选）：
  - <追加项>：<结果>
- **结果摘要**：通过 / 未通过（<一句话>）
```

### Step 3a：全部通过

- commit：`git commit --allow-empty -m "docs: task-<id> D 节验收"`（若 D 节改动和 C 节共一个 commit 也行；具体和 execute skill 协调）
- 返回 `ok`

### Step 3b：任一失败

**基础设施型失败**（极窄白名单，**最多自救一次**）：

- 症状明确指向缺生成物 / 未装依赖 / 未跑迁移（例："Property 'x' does not exist on type 'PackSelect'"、`Cannot find module 'next'`、`@prisma/client` 未生成）。
- 处置：**只**做修复性命令（`prisma generate` / `pnpm install` / `prisma migrate dev` 等**不改源码**的动作），然后**重跑一次**标准命令。
- 若重跑仍失败 → 不得再自救，走下面回流。
- D 节需要加一条 `- **基础设施预热**：<做了什么>`，表明第一次失败原因与自救动作，不隐瞒。

**非基础设施型失败**：不得重试更多次验证；**一次失败就进入回流**。

1. 填 E 节：

```markdown
## E. 失败回流（Failure Feedback）

- **失败现象**：<1-2 句>
- **根因假设（<=3）**：
  1. ...
  2. ...
  3. ...
- **下一轮最小任务（<=0.5 天）**：<具体任务标题，目标、范围、验收>
- **需要新增的测试/CI 守门**：<可选>
```

2. 把「下一轮最小任务」追加到 `docs/ROADMAP.md` 对应段落（新 `todo` 行，用 `-1`/`-2` 派生 ID，如 `P2-R-1-fix-1`）；或写入 `docs/IDEAS-INBOX.md`（若暂不确定优先级）。

3. ROADMAP 当前任务标 `⚠️`（失败）；task 文档 F 节「（如失败）已产出下一轮任务」勾选。

4. 不强制回滚：
   - 轻量模式：失败的 commit 保留在 main，E 节 + 下一轮任务就是补救措施
   - PR 模式：PR 保持现状（不 ready），label 保持或换成 `status:in-progress`；不要扔给 review 一个红 CI

5. 返回 `fail`

### Step 4：CHECKPOINT

无论成功失败，`/harness-go` 3g 会统一更新 checkpoint-now.md；本 skill 不直接写。

---

## 反模式（禁止）

- ❌ 失败了重试到通过再填 D 节（掩盖失败）
- ❌ 用 `|| true` / `--passWithNoTests` 让命令"假装通过"
- ❌ 跳过子系统追加命令（CLI 改动却没跑 CLI smoke）
- ❌ 失败时只填 D 节不填 E 节（不给下一轮任务 = 任务烂尾）
- ❌ 在本 skill 内修**源码**"顺便修复"——那是下一轮任务的事（基础设施预热例外，仅限 3b 白名单命令）
- ❌ 滥用基础设施白名单：症状是业务类型错/逻辑错时，强行归类"基础设施"以绕过回流
