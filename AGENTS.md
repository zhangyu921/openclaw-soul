# OpenClaw Soul — 协作者 / AI 指引

本文件是仓库内 **AI 与人类的单一入口**：领域模型、约束、习惯与文档导航均在此

---

## 导航（先读哪）

| 场景 | 文档 |
|------|------|
| 终端用户、npm CLI | [`README.md`](README.md) |
| 克隆仓库、本地 Web/CLI、环境变量、发版 | [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) |
| 部署 | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| 产品与路线图 | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| 仅改 `web/`（Next.js） | [`web/AGENTS.md`](web/AGENTS.md) |

---

## 项目一句话

Monorepo（`web/` Next.js registry + `packages/cli`）让用户把 OpenClaw **workspace** 打成 zip 上架（**打包范围可选**：非交互默认根目录子集为 `SOUL.md` 与存在的 `IDENTITY.md`、`--full` 整目录、`--include` 追加根文件如 `MEMORY.md`），下载后由 CLI **一键 apply** 到本机 `openclaw.json` 指向的目录。命令细则不重复写，见 `README` / `docs/DEVELOPMENT.md`。

---

## 领域模型（改代码前心里要有）

- **Pack**：作者 **handle** + **slug** 唯一；站点路径 `/packs/<handle>/<slug>`；用户侧 `apply <handle>/<slug>`。
- **Workspace**：OpenClaw 文档中的 [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)；实际路径以本机 `~/.openclaw/openclaw.json` 为准，代码里以 **`agents.defaults.workspace`** 为准（兼容读旧版 `agent.workspace`）。
- **配置写回**：可读 JSON5；写回可能丢注释——若动 CLI 写配置逻辑，在帮助或注释里保持这一预期。

---

## 不可违背的安全 / 产品约束

- **`apply` / 改配置前**：用 **rename 或 copy** 做备份，**不要用 `rm -rf`** 销毁用户目录。
- **MVP 隐私**：默认 publish 子集、全量 zip 都可能含 **`MEMORY.md`**；不做自动脱敏。改 UX 时延续「风险提示 + 自觉打码」，别偷偷承诺已脱敏。

---

## CLI 行为锚点（易忘点）

- **`publish`**：默认打包范围、`--full` / `--include`、上架成功用 API 返回的 **`viewUrl`**（对齐 `OPENCLAW_SOUL_SITE_URL` / 主域，避免只配了 `*.vercel.app` 时链错）——细则见 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)。
- **存储**：若涉及 Vercel Blob，同 slug 覆盖可能留下历史对象（如 `addRandomSuffix`）；与成本/私有库相关的约定见实现与 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

---

## 仓库习惯

- **包管理**：pnpm workspace；开发 CLI 用根目录 **`pnpm run ocs -- …`**（见根 `package.json` `ocs` 脚本）。
- **CLI 发版**：不要手改 `packages/cli` 的 `package.json` version 与 `CHANGELOG.md`，只用 **Changesets**（`pnpm changeset` / `.changeset/*.md`），流程见 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) 里的「发布 `@openclaw-soul/cli`」一节。
- **Git**：一个功能点做完、准备开新功能前，可提醒是否先 **`git commit`**，避免混进无关改动。
