# AGENTS.md

本文件定义本仓库开发与协作的执行约束：改代码、接 API、写文案时，始终对准**项目使命与边界**，避免局部最优。

根目录本文 **≤100 行**（CI 校验）。**领域名词、CLI 行为细节、仓库习惯全文**见 [`docs/REPOSITORY-CONTEXT.md`](docs/REPOSITORY-CONTEXT.md)。

---

## 使命（终极目标）

**「找到你真正想聊的那一个 Soul。」**

我们要帮助用户 **发现、体验、分享、安装与部署** 以 **Soul**（OpenClaw workspace / persona **pack**）为基础的 **人格化对话**，让用户得到连贯、可信、可复用的体验；情绪向与功能向 pack 都包含在内。

本仓库是达成上述体验的基础设施：**registry**（Next.js `web/`）+ **`ocs` CLI**（`packages/cli` / `@openclaw-soul/cli`）——把本机 workspace 上架为 zip、从站点按 `handle/slug` 装回 workspace。分期与动机见 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

---

## 开发时如何对齐使命

- 新功能、重构、接口与文案：优先问——是否让用户**更接近**「发现 → 体验 → 分享 → 安装/部署」中的一环，是否**提升**与 Soul 对话的质量或可信度。
- OpenClaw 侧概念以 **[Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)** 为准；本仓库如何把 workspace 接到 registry、路径与配置约定见 REPOSITORY-CONTEXT。

---

## 协作原则（第一性原理）

- **先澄清目标再执行**：若用户动机、目标或成功标准不清晰，先提问澄清，不做“猜测式实现”。
- **默认寻找最短路径**：目标明确时，优先选择最短可验证路径，而非沿用惯例/模板流程。
- **发现更优路径要暂停**：若可显著降低时间、风险或改动面（经验阈值：约 >=30%），必须先暂停并提出替代方案，待用户确认后再继续。
- **追根因，不打补丁**：遇到问题先定位根因；临时修补仅在用户明确接受 trade-off 时采用，并记录原因。
- **只说改变决策的信息**：输出聚焦结论、取舍、证据与下一步，删除不影响决策的冗余信息。

### 路径优化触发后的固定输出（必须遵循）

1. 当前路径的问题（1 句）
2. 更优路径（1 句）
3. 预期收益（时间/风险/复杂度）
4. 需要用户决策的选项与推荐项

---

## 硬约束（不可打破）

- **`apply` 与写配置**：只 **rename 或 copy** 备份用户数据目录，**禁止对用户目录 `rm -rf`**。
- **隐私**：`MEMORY.md` 等可能进入 zip；不做自动脱敏；界面与文案**不得**暗示「已脱敏」。

---

## 文档索引（按需深读）

| 需要 | 打开 |
|------|------|
| 终端用户说明、CLI 概览 | [`README.md`](README.md) |
| 本地跑通、环境变量、`publish` / `apply`、发版 | [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) |
| Pack/Workspace 模型、安全条文、CLI 锚点、开发习惯 | [`docs/REPOSITORY-CONTEXT.md`](docs/REPOSITORY-CONTEXT.md) |
| 部署 | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| Harness 执行闭环（MVP） | [`docs/HARNESS-WORKFLOW.md`](docs/HARNESS-WORKFLOW.md) |
| Harness 状态机与标签协议 | [`docs/HARNESS-STATE-MACHINE.md`](docs/HARNESS-STATE-MACHINE.md) |
| Harness 执行命令规范（/harness-go） | [`docs/HARNESS-GO-SPEC.md`](docs/HARNESS-GO-SPEC.md) |
| Harness 任务模板 | [`docs/HARNESS-TASK-TEMPLATE.md`](docs/HARNESS-TASK-TEMPLATE.md) |
| 想法收件箱（自由一行一条） | [`docs/IDEAS-INBOX.md`](docs/IDEAS-INBOX.md) |
| 设计与执行计划草稿 | [`docs/superpowers/specs/`](docs/superpowers/specs/) · [`docs/superpowers/plans/`](docs/superpowers/plans/) |
| 仅改 `web/`（Next.js） | [`web/AGENTS.md`](web/AGENTS.md) |

---

## 常用命令

- **依赖 / 开发 / 测**：`pnpm install` · `pnpm run dev` · `pnpm run ocs -- <subcommand>` · `pnpm test`
- **CLI 发版**：只用 **Changesets**，勿手改 `packages/cli` 的 version 与 `CHANGELOG`（见 DEVELOPMENT）。

---

## 与 harness 工程对齐

- **根目录篇幅**：`AGENTS.md` 由 CI 限制 **≤100 行**，细节在 `docs/`；避免单文件叙事过长、挤占任务上下文。
- **合并前**：跑 **`pnpm test`**；与用户目录安全、`apply` 行为相关的逻辑，优先用测试或 CI 守门，而不是只写在文档里。
