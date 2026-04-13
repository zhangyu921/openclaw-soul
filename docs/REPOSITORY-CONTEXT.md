# 领域与实现条文（配合根目录 AGENTS.md）

根目录 [`AGENTS.md`](../AGENTS.md) 写明**使命、对齐方式、硬约束与文档索引**（篇幅短，方便 agent 常驻上下文）。  
**本文**补充：OpenClaw 背景、**pack / workspace** 领域模型、`publish`/`apply` 行为摘要、安全与隐私、CLI 易忘点、日常开发习惯。  
命令与本地跑通以 [`DEVELOPMENT.md`](DEVELOPMENT.md) 为准。

---

## 与使命的关系（一句话）

OpenClaw Soul 把「本机 [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)」接到 **registry**：作者打包上架，他人浏览、下载、`apply` 装回——全链路支撑 **发现、体验、分享、安装与部署** Soul / persona pack。

---

## 背景（OpenClaw）

本机 workspace 默认类似 `~/.openclaw/workspace`；根目录常见 **`SOUL.md`**（人格与行为）、可选 **`IDENTITY.md`**、可能含隐私的 **`MEMORY.md`** 等。详见 OpenClaw 文档中的 [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)。

---

## 仓库形态与 CLI 摘要

**Monorepo**：pnpm — **`web/`** Next.js registry（注册、画廊、Token、pack 详情与下载）；**`packages/cli`** 提供全局命令 **`ocs`**。

**`publish`**：从本机 workspace **打 zip 上传**。非交互默认根目录 **`SOUL.md`**（缺失则失败）+ 若存在则 **`IDENTITY.md`**；**`MEMORY.md` 默认不进包**，需 **`--include MEMORY.md`** 或向导勾选。**`--full`** 整棵 workspace；**`--include <根下文件>`** 可重复。向导会先问是否整目录（默认否）；默认值等见根目录 `README`。

**`apply`**：`handle/slug` 从 registry 拉 zip，解压到 **`openclaw.json` → `agents.defaults.workspace`**（先备份，**禁止 `rm -rf` 用户目录**）。

环境变量、备份子命令、边界行为见 [`README.md`](../README.md) 与 [`DEVELOPMENT.md`](DEVELOPMENT.md)。

---

## 领域模型（改代码前要有共识）

- **Pack**：**handle** + **slug** 全站唯一；路径 `/packs/<handle>/<slug>`；CLI `apply <handle>/<slug>`。
- **Workspace**：实际路径以本机 `~/.openclaw/openclaw.json` 为准；代码以 **`agents.defaults.workspace`** 为准（兼容旧键 `agent.workspace`）。
- **配置写回**：可读 JSON5；写回可能丢注释——动 CLI 写配置时在帮助或注释中说明。

---

## 安全与产品约束

- **`apply` / 改配置**：**rename 或 copy** 备份；**不要用 `rm -rf`** 销毁用户目录。
- **隐私**：默认子集或全量 zip 都可能含 **`MEMORY.md`**；不做自动脱敏。UX 保持「风险提示 + 用户自觉」；勿承诺已脱敏。

---

## CLI 行为锚点（易忘）

- **`publish` 成功**：以 API 返回的 **`viewUrl`** 为准（配合 **`OPENCLAW_SOUL_SITE_URL`** / 主域，避免长期显示 `*.vercel.app`）——见 DEVELOPMENT。
- **存储**：Vercel Blob 等同 slug 覆盖可能留下历史对象（如 `addRandomSuffix`）；成本与私有库见 [`DEPLOY.md`](DEPLOY.md) 与实现。

---

## 仓库习惯

- **工具**：优先查上游是否已有**官方支持的配置或扩展点**，再考虑业务层绕法。
- **包管理**：pnpm workspace；CLI 开发用 **`pnpm run ocs -- …`**。
- **CLI 发版**：仅 **Changesets**；勿手改 `packages/cli` 的 version 与 `CHANGELOG`（见 DEVELOPMENT）。
- **Git**：功能点完成、开新功能前，可提醒 **`git commit`**，避免混杂无关改动。
