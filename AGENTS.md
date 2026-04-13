# AGENTS.md

**主要读者**：在本仓库里持续开发、集成与修缺陷的 **coding agent**（人类协作者也可读）。  
**本文目的**：让你在改代码、接 API、写文案时，始终对准**项目的使命与边界**，而不是只做局部最优。

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
