---
name: harness-recon
description: Tick 内代码侦察 + 多方案产出 + 分歧度评分。替代 superpowers:brainstorming 的人机逐问节奏，无 HARD-GATE、不问用户、产物直接写文件。
---

# HARNESS RECON

被 `/harness-go` 在 P3 的 **3c** 调用。目标：**在一次 tick 内**完成「读代码 → 列方案 → 给推荐 → 打分歧度」，产物直接写入 task 文档，让 3d 能用数据做模式/阶段判定。

**核心差异（vs superpowers:brainstorming）**：

- 不问用户、不等批准、不分段交互；
- 产物是**文件**（task 文档 B 节、可选 mini-spec），不是对话；
- 必须输出**机器可读的分歧度评分**，这是 3d 分流的唯一输入。

---

## 输入

- task 文档路径 `docs/harness/task-<id>.md`（A 节必须已填）
- 相关代码仓（只读）
- 可选：历史 spec/plan、旧 task 文档

## 输出

写回 **同一个** task 文档的 B 节，格式严格如下（agent 必须原样填，不得省 YAML 块）：

````markdown
## B. 执行拆解（Execution Plan）

```yaml
divergence: low | medium | high
divergence_rationale: <一句话，指出触发条件>
scope_files_estimate: <数字，预计改动文件数>
touches_hard_constraints: <true | false>
recommended_alternative_id: A
alternatives_blocked_if_chosen: <若选推荐方案会关上哪些门；none 表示无>
```

**方案对比**

| 方案 | 思路 | 取舍 | 建议 |
|------|------|------|------|
| **A（推荐）** | … | … | ✅ |
| B | … | … | — |
| C（可选） | … | … | — |

**推荐方案子步骤**（3~5 步，每步独立可验证）

1. …
2. …
3. …

**未采纳方案的触发条件**（给后续 review 用）

- 若 <条件> → 改走 B
- 若 <条件> → 改走 C
````

如果任务过于复杂、B 节写不下详细子步骤（预计 ≥5 文件 或 跨模块），B 节只保留方案对比表与分歧度评分，**子步骤交给 `harness-planning`**，并在 B 节末尾写明「详细子步骤见 plan」。

---

## 流程

### Step 1：读 task A 节

提炼：目标、范围、非目标、验收条件、风险点。

- 验收条件不可验证 → **停 tick**。在 task 文档 E 节写 `验收条件需补全：<具体问题>`，ROADMAP 标 `⚠️`。
- A 节缺 **非目标** / **风险点** → agent 自行补齐再继续（不停 tick）。

### Step 2：代码侦察

用 Grep / Glob / Read 探明：

- 要改的文件与现有复用点（组件、lib、API）
- 现有测试覆盖面（相关 `*.test.ts?` / Playwright 用例）
- 硬约束相关路径（`apply`、隐私、Prisma schema、CLI 发版）

产出一份**文件清单估计**，放进 `scope_files_estimate`。

### Step 3：生成 ≥2 个方案

最少 A/B 两个，建议 A/B/C。每个方案必须具备：

- 一句话思路
- **与验收条件的映射**（能否全满足）
- 取舍（包大小、改动面、可逆性、与未来方向的兼容）

### Step 4：选推荐

选一个标 `✅`。选择理由隐式写在「取舍」列即可。**禁止**在 B 节里写长段论证；长推理走 mini-spec（见下）。

### Step 5：分歧度评分（强制）

按下表判定，**任一** high 即 high；无 high、任一 medium 即 medium；全满足 low 条件才 low。

| 触发条件 | 分歧度 |
|------|------|
| 修改 Prisma schema / 迁移 | **high** |
| 修改 auth / 隐私 / `apply` 写盘 / CLI 发版流程（硬约束） | **high** |
| 破坏公共 API、CLI 子命令语义、`openclaw.json` 字段格式 | **high** |
| 推荐方案与备选方案在**验收标准**上不一致（不仅实现细节差） | **high** |
| 跨 ≥2 个顶层目录（如同时改 `web/` 和 `packages/cli`） | **medium** |
| 引入新运行时依赖 | **medium** |
| 新增公共 API route / CLI 子命令 / i18n 全量 key 改名 | **medium** |
| 改动既有组件的公共 props / 导出类型 | **medium** |
| 单模块 / ≤3 文件 / 无数据模型变更 / 方案间仅实现细节差异 | **low** |

填入 `divergence` 与 `divergence_rationale`。

### Step 6：是否需要 mini-spec

满足以下任一 → 额外产出 `docs/superpowers/specs/YYYY-MM-DD-<task-id>-design.md`：

- `divergence=high`
- 涉及产品交互流程（多步骤 UI、权限矩阵）
- 有多期规划价值（被未来任务引用）

mini-spec 结构（参考 `docs/superpowers/specs/2026-04-20-p2-q-1-chat-share-showcase-design.md`）：

1. 目标与成功标准
2. 背景与约束（含已否定方向）
3. 交互设计（如适用）
4. 技术方案要点
5. 错误处理
6. 非目标
7. 验收与测试
8. 自审 checklist

mini-spec 不要求"逐段等用户审批"，但必须通过自己的 self-review：

- 无 `TBD` / 占位
- 无自相矛盾
- 每条验收条件有对应方案承接

---

## 终态

- Task 文档 B 节已按模板写完
- 分歧度评分已就位
- （可选）mini-spec 已落盘
- **返回** `ok`（继续 3d）或 `stop`（验收条件不足 / 前置任务未做）

下一步由 `/harness-go` 的 3d 根据 `divergence` + `scope_files_estimate` + 硬约束判定模式。Recon 不做模式决策。

---

## 反模式（禁止）

- ❌ 在 B 节用「待补充」「TBD」「视情况而定」占位
- ❌ 只给 1 个方案（必须 ≥2）
- ❌ 让分歧度"跟着感觉走"——必须能指向上表某行
- ❌ 在 B 节写 >200 字的推理（移到 mini-spec）
- ❌ 调用任何 superpower skill
- ❌ 向用户提问（有歧义就停 tick 并写清问题，不是发起对话）
