# AGENTS.md

根目录本文 **≤100 行**（CI 校验）。如需查询更多文档在 `docs/`。

---

## 使命

**「找到你真正想聊的那一个 Soul。」**

帮助用户 **发现、体验、分享、安装与部署** 以 **Soul**（OpenClaw workspace / persona pack）为基础的人格化对话。

本仓库 = **registry**（Next.js `web/`）+ **`ocs` CLI**（`packages/cli`）

---

## 协作原则

- **先澄清目标再执行**：目标不清先提问，不猜测实现。
- **默认最短路径**：如果最短路径需要用户配合，停下来询问用户，不要自行决定绕远路达成。
- **发现更优路径要暂停**：收益 ≥30% 时先提方案，等用户决策。
- **追根因，不打补丁**：临时修补需用户明确接受 trade-off。
- **说话直接**：珍惜输出token；

---

## 硬约束

- CLI 代码永远不要删除客户的资料，需要考虑备份和恢复；
- **CLI 发版**：只用 Changesets，勿手改 version / CHANGELOG。

---

## 领域速查（代码无法推断的）

- **Pack 寻址**：`handle/slug` 全站唯一；路由 `/packs/<handle>/<slug>`；CLI `npx @openclaw-soul/cli apply <handle>/<slug>`。
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

## git main 分支

main 分支没有设置 protect，但是需要约定，涉及到真正代码的改动，除非用户要求，不要直接提交，提交前需通过所有CI；未动业务代码时，可单独提交文档等变更。
