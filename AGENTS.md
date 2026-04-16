# AGENTS.md

根目录本文 **≤100 行**（CI 校验）。细节在 `docs/`。

---

## 使命

**「找到你真正想聊的那一个 Soul。」**

帮助用户 **发现、体验、分享、安装与部署** 以 **Soul**（OpenClaw workspace / persona pack）为基础的人格化对话。

本仓库 = **registry**（Next.js `web/`）+ **`ocs` CLI**（`packages/cli`）——workspace 上架为 zip、按 `handle/slug` 装回本机。

---

## 协作原则

- **先澄清目标再执行**：目标不清先提问，不猜测实现。
- **默认最短路径**：目标明确时不沿用惯例。
- **发现更优路径要暂停**：收益 ≥30% 时先提方案，等用户决策。
- **追根因，不打补丁**：临时修补需用户明确接受 trade-off。
- **只说改变决策的信息**。

---

## 硬约束

- **`apply` / 写配置**：只 rename 或 copy 备份，**禁止 `rm -rf` 用户目录**。
- **隐私**：zip 可能含 `MEMORY.md`；不做自动脱敏；文案**不得**暗示「已脱敏」。
- **CLI 发版**：只用 Changesets，勿手改 version / CHANGELOG。

---

## 领域速查（代码无法推断的）

- **Pack 寻址**：`handle/slug` 全站唯一；路由 `/packs/<handle>/<slug>`；CLI `ocs apply <handle>/<slug>`。
- **publish 默认**：根文件 `SOUL.md`（必须）+ `IDENTITY.md`（可选）；`MEMORY.md` 默认**不**进包。
- **配置写回**：`openclaw.json` 可读 JSON5，写回会丢注释——改 CLI 写配置时需说明。

---

## /harness-go

当收到 `/harness-go` 指令时，读取并严格执行 [`docs/skills/harness-go.md`](docs/skills/harness-go.md) 中的完整步骤。

---

## 文档索引

| 需要 | 打开 |
|------|------|
| 本地跑通、环境变量、发版 | [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) |
| 部署 | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| Harness 相关文档 | [`docs/harness/`](docs/harness/) |
| 想法收件箱 | [`docs/IDEAS-INBOX.md`](docs/IDEAS-INBOX.md) |
| 仅改 `web/` | [`web/AGENTS.md`](web/AGENTS.md) |

---

## 常用命令

- `pnpm install` · `pnpm run dev` · `pnpm run ocs -- <subcommand>` · `pnpm test`
