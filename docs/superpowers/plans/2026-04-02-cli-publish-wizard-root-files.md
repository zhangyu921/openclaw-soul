# CLI `publish` 根文件向导与默认子集 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 [`docs/superpowers/specs/2026-04-02-cli-publish-wizard-root-files-design.md`](../specs/2026-04-02-cli-publish-wizard-root-files-design.md)：`publish` 交互向导中整目录选项置顶、整目录态下其余根文件项禁用且全选展示、子集默认 SOUL +（存在的）IDENTITY、MEMORY 不默认；非交互默认子集为 SOUL +（若存在）IDENTITY + `--include`；任意路径在 zip 前校验根目录存在 `SOUL.md` 否则中文报错退出；更新文档与 Changeset。

**Architecture:** 将「根目录必须有 SOUL.md」与「非交互默认子集文件列表」抽成 **可单测** 的小函数（新建 `packages/cli/src/workspace-publish-guards.ts` 或等价命名），`index.ts` 在解析 `sourceDir` 后、`publishPack` 前调用。向导逻辑集中在 `publish-wizard.ts`：用 **状态循环** 实现「整目录展示态」（`fullDisplayMode` 时重建 `choices`，整目录首项可取消，其余根文件项 `disabled: true` 且 `checked: true`）；进入整目录态前 **保存子集勾选快照**，退出时恢复。若 `@inquirer/prompts` 的 `checkbox` 对 `disabled` 选项的返回值与预期不符，以 **一次试跑** 为准调整（必要时仅将「可交互」项计入 `picked`）。

**Tech Stack:** Node `fs`/`path`，`@inquirer/prompts`（`checkbox`），`vitest`，`pnpm` / `tsx`（`pnpm run ocs`）。

**Spec:** [`2026-04-02-cli-publish-wizard-root-files-design.md`](../specs/2026-04-02-cli-publish-wizard-root-files-design.md)

---

## 文件结构（将创建 / 修改）

| 文件 | 职责 |
|------|------|
| `packages/cli/src/workspace-publish-guards.ts`（新建） | `assertWorkspaceRootSoulFileExists(sourceDir)`：校验 `SOUL.md` 存在且为文件，否则 `throw`（英文 `Error.message` 供顶层统一输出，或直接在函数内约定中文 message，与现有 CLI 风格对齐）。可选：`buildNonInteractiveSubsetFiles(sourceDir, includeList)` 返回去重后的 `string[]`。 |
| `packages/cli/src/index.ts` | `publish` action：在 `publishPack` 前调用 SOUL 校验；非交互 `subsetFiles` 改为 `buildNonInteractiveSubsetFiles`（或内联等价逻辑）；更新 `.description()` 文案。 |
| `packages/cli/src/publish-wizard.ts` | 重写 `promptPackRootFiles`：顺序、IDENTITY/MEMORY/extras、整目录循环态、快照恢复。 |
| `packages/cli/test/workspace-publish-guards.test.ts`（新建） | 临时目录夹具：有/无 SOUL、有/无 IDENTITY、非交互子集列表。 |
| `README.md`（仓库根） | 替换「默认 SOUL+MEMORY」表述。 |
| `docs/DEVELOPMENT.md` | `publish` 小节与示例命令注释。 |
| `AGENTS.md` | 领域模型一句中 publish 默认范围（若提及 MEMORY）。 |
| `packages/cli/CHANGELOG.md` | 由 **Changeset** 生成；计划中提醒执行 `pnpm changeset`。 |

---

### Task 1: `workspace-publish-guards` 与单元测试

**Files:**
- Create: `packages/cli/src/workspace-publish-guards.ts`
- Create: `packages/cli/test/workspace-publish-guards.test.ts`
- Modify: `packages/cli/package.json`（若需暴露 test；通常不必）

- [ ] **Step 1: 写失败用例（无 SOUL）**

在 `workspace-publish-guards.test.ts` 用 `fs.mkdtempSync` + `writeFileSync` 仅写 `IDENTITY.md`，调用 `assertWorkspaceRootSoulFileExists(dir)`，期望 `expect(() => ...).toThrow()`。

- [ ] **Step 2: 运行确认失败**

```bash
cd /Users/yuzhang/proj/openclaw-soul && pnpm exec vitest run packages/cli/test/workspace-publish-guards.test.ts
```

Expected: FAIL（函数未实现）

- [ ] **Step 3: 实现 `assertWorkspaceRootSoulFileExists`**

使用 `path.join(sourceDir, "SOUL.md")`，`fs.existsSync` + `statSync` 判断 `isFile()`；否则抛出带 **绝对或清晰路径** 的 `Error`（中文 message，与 spec §4 一致）。

- [ ] **Step 4: 实现 `buildNonInteractiveSubsetFiles(sourceDir, includeNames: string[])`**

逻辑：`["SOUL.md"]`；若 `IDENTITY.md` 存在且为文件则 push；再 `assertSafeRootRelativeFile` 对每个 `--include`（从 `index` 传入已解析名或在内层调用 — **注意**与现有 `index.ts` 一致，在已 `assertSafeRootRelativeFile` 之后合并去重）。返回 `[...new Set(...)]` 顺序：SOUL 固定首位，其余按 spec 可接受任意稳定顺序。

- [ ] **Step 5: 写通过用例**

- 临时目录含 `SOUL.md` + `IDENTITY.md`：子集含二者。  
- 仅 `SOUL.md`：子集仅 `SOUL.md`。  
- `SOUL.md` + `--include` MEMORY：含 `MEMORY.md`。

- [ ] **Step 6: 运行全部通过**

```bash
pnpm exec vitest run packages/cli/test/workspace-publish-guards.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/workspace-publish-guards.ts packages/cli/test/workspace-publish-guards.test.ts
git commit -m "feat(cli): add workspace SOUL guard and non-interactive subset builder"
```

---

### Task 2: `publish` 命令接入校验与子集

**Files:**
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: 在解析 `sourceDir` 且 `ensurePublishPrivacyConsent` 之后、`publishPack` 之前** 调用 `assertWorkspaceRootSoulFileExists(sourceDir)`（**含** `packFull` 与 **非** `packFull` 的所有路径）。

- [ ] **Step 2: 替换非交互子集分支**

将 `subsetFiles = [...new Set(["SOUL.md", "MEMORY.md", ...extra])]` 改为 `buildNonInteractiveSubsetFiles(sourceDir, includeList.map(...))`（或先 `map` `assertSafeRootRelativeFile` 再传入 — 保持与现有一致：**禁止**路径穿越）。

- [ ] **Step 3: 更新 `publish` 的 `.description()`** 字符串（中文）：默认 **SOUL + 存在的 IDENTITY**；MEMORY 需 `--include`；`--full` / `--include` 含义不变。

- [ ] **Step 4: 运行 CLI 包测试**

```bash
pnpm exec vitest run packages/cli/test/
```

Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): enforce SOUL.md and new non-interactive publish subset"
```

---

### Task 3: 交互向导 `promptPackRootFiles`

**Files:**
- Modify: `packages/cli/src/publish-wizard.ts`

- [ ] **Step 1: 调整 `extras` 过滤**

从 `WORKSPACE_ROOT_FILE_ALLOWLIST` 排除 `SOUL.md`、`MEMORY.md`、**`IDENTITY.md`**（与现排除逻辑合并），仅保留**根目录存在**的其它白名单文件。

- [ ] **Step 2: 构建「子集态」`choices` 顺序**

1. `PACK_FULL_SENTINEL`（`checked: false`）  
2. `SOUL.md`（必选，`disabled: true`, `checked: true`）  
3. `IDENTITY.md`：存在则 `checked: true` 且可勾选；不存在则 `checked: false`, `disabled: true`, `name` 含「当前目录无此文件」类说明  
4. `MEMORY.md`：`checked: false`（**不**再按存在默认勾选）  
5. `extras`（`checked: false`）  
6. **不要**在整目录与文件区之间插入 `Separator`（除非产品希望保留视觉分隔；spec 未强制 separator，可与现有一致性优先 — **整目录已在最上**，可去掉原「文件区与整目录之间」的 separator）

- [ ] **Step 3: 实现整目录展示态循环**

伪代码结构供实现时对照：

```text
let fullDisplayMode = false
let subsetSnapshot: string[] | null = null
loop:
  choices = fullDisplayMode ? buildFullModeChoices() : buildSubsetModeChoices()
  picked = await checkbox({ ... })
  if fullDisplayMode:
    if FULL not in picked: fullDisplayMode = false; restore defaults from subsetSnapshot; continue
    else: return { fullZip: true }
  else:
    if FULL in picked: subsetSnapshot = deriveFromPicked(picked); fullDisplayMode = true; continue
    else: return { fullZip: false, selectedRootFiles: normalize(picked) }
```

**注意：** `buildFullModeChoices()` 中除 `PACK_FULL_SENTINEL` 外，所有根文件项 `disabled: true` 且 `checked: true`（对**不存在的**文件是否显示一行 disabled+unchecked？spec 要求「全勾选」表达整包 — 建议 **仅展示 allowlist 中已存在的根文件** 为 disabled+checked；不存在的文件可不重复展示或展示为 disabled+unchecked，与产品一致即可，**文档化在 commit message**）。

- [ ] **Step 4: 移除依赖「整目录 + 其它 → validate 报错」**；子集态 `validate` 仅在非整目录且未选任何有效项时提示（SOUL 始终 disabled 选中，通常不会空）。

- [ ] **Step 5: 手动 TTY 试跑**（本地）

```bash
pnpm run ocs -- publish
```

走向导：确认整目录在首、勾选整目录后进入全选禁用态、取消整目录恢复。

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/publish-wizard.ts
git commit -m "feat(cli): publish wizard root file order and full-zip display mode"
```

---

### Task 4: 文档与 AGENTS

**Files:**
- Modify: `README.md`
- Modify: `docs/DEVELOPMENT.md`
- Modify: `AGENTS.md`（仅相关一句）

- [ ] **Step 1: 根 `README.md`** — 替换默认打包描述为 **SOUL +（若存在）IDENTITY**；MEMORY 与 `--include`；交互向导一句对齐 spec §5。

- [ ] **Step 2: `docs/DEVELOPMENT.md`** — 「默认只…SOUL 与 MEMORY」改为新默认；向导多选描述对齐（整目录置顶、MEMORY 不默认等）。

- [ ] **Step 3: `AGENTS.md`** — 若「默认根目录子集」仍写 SOUL+MEMORY，改为新表述。

- [ ] **Step 4: Commit**

```bash
git add README.md docs/DEVELOPMENT.md AGENTS.md
git commit -m "docs: align publish default subset with SOUL + IDENTITY"
```

---

### Task 5: Changeset（破坏性变更）

- [ ] **Step 1: 在仓库根执行**

```bash
pnpm changeset
```

选择 `@openclaw-soul/cli`，**minor 或 major**：默认子集从「SOUL+MEMORY」变为「SOUL+（若存在）IDENTITY」，为破坏性变更，**建议 `major`**（若团队希望更温和可 `minor` + 强发布说明 — 计划按 **semver 严格性** 优先 `major`）。

- [ ] **Step 2: 填写变更说明**（中英文均可，需提及 `--include MEMORY.md` 迁移）。

- [ ] **Step 3: Commit changeset 文件**

```bash
git add .changeset/
git commit -m "chore(cli): add changeset for publish default subset breaking change"
```

---

## 验证清单（完成前自检）

- [ ] `pnpm exec vitest run packages/cli/test/` 全绿  
- [ ] 无 `SOUL.md` 的 workspace：`pnpm run ocs -- publish --slug x --source <dir>` 非零退出且 stderr 含说明  
- [ ] 有 SOUL、无 IDENTITY、无 `--include`：zip 仅含 `SOUL.md`（可用临时目录 + 若项目有 dry-run 则略；否则依赖 `zipSelectedFiles` 行为与集成测试）  
- [ ] 文档三处不再写「默认必含 MEMORY」

---

## Plan review

本仓库未包含 `plan-document-reviewer` 子 agent；**以人工或后续 CR 为准**。

---

## Execution handoff

**计划已保存至：** `docs/superpowers/plans/2026-04-02-cli-publish-wizard-root-files.md`

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 新开子 agent，任务间 review，迭代快  
2. **本会话内执行** — 按 Task 顺序在本对话中改代码，每 Task 结束自检

**你希望用哪一种？** 若未指定，默认按 **本会话内顺序实现**（Task 1 → 5）。
