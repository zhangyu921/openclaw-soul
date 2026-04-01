# @openclaw-soul/cli

CLI for **[OpenClaw Soul](https://github.com/zhangyu921/openclaw-soul)** — register, publish, and apply **OpenClaw workspace** packs（全局命令 **`ocs`**）。

## 命令一览

| 层级 | 命令 | 用途 |
|------|------|------|
| **主流程** | `login` | 浏览器 device flow 登录，写入 `OPENCLAW_SOUL_TOKEN` |
| | `publish` | 将本机 workspace 打成 zip 并上传到 registry |
| | `apply <handle>/<slug>` | 从 registry 下载 zip、解压到 `~/.openclaw/workspace-<slug>`，并写入 `openclaw.json` 的 `agents.defaults.workspace`（已有目录/配置会先备份为 `.bak.*`） |
| **备份 / 恢复** | `archive-directory` | 将目录 **rename** 为 `dir.bak.<时间戳>`（不删除） |
| | `backup-openclaw-config` | 复制 `openclaw.json` → `openclaw.json.bak.<时间戳>` |
| | `restore-openclaw-config` | 从 `.bak.*` 恢复（`--list` / `--latest` / `--from`；恢复前会先备份当前文件） |

运行 `ocs --help` 可查看各子命令的选项（子命令已按字母排序）。

## Install

Run `npx @openclaw-soul/cli --help`（全局安装后也可用 `ocs --help`）。常用：`npx @openclaw-soul/cli login`、`npx @openclaw-soul/cli publish`、`npx @openclaw-soul/cli apply <handle>/<slug>`（全局安装时等价于 `ocs login` 等）。

**Registry URL**：在 `loadCliEnv()` 之后若仍无 `OPENCLAW_SOUL_API`，默认连线上 **`https://openclaw-soul.basilfield.com`**（[`constants.ts`](https://github.com/zhangyu921/openclaw-soul/blob/main/packages/cli/src/constants.ts)）。自建 registry 请设环境变量或 `--api`。

**在本仓库开发**：将根目录 [`.env.cli.example`](https://github.com/zhangyu921/openclaw-soul/blob/main/.env.cli.example) 复制为 `.env.cli`，并设置 `OPENCLAW_SOUL_API` 指向本地站点（示例为 `http://localhost:3000`）；未配置时 CLI 与 CI 一样默认连线上。

## Docs

- Monorepo（用户向）：[README](https://github.com/zhangyu921/openclaw-soul/blob/main/README.md)
- Monorepo（开发）：[docs/DEVELOPMENT.md](https://github.com/zhangyu921/openclaw-soul/blob/main/docs/DEVELOPMENT.md)
- OpenClaw workspace: [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)

## Development

From the repo root, use `pnpm run ocs -- …`（见 [`docs/DEVELOPMENT.md`](https://github.com/zhangyu921/openclaw-soul/blob/main/docs/DEVELOPMENT.md)）。

**测试**：在 `packages/cli` 下执行 `pnpm test`。集成测试使用临时 `HOME` 与临时 `cwd`，不写入本机 `~/.openclaw`；`downloadToFile` / `extractZip` 在同进程内测，避免子进程加载 `.env.cli` 与代理环境导致不稳定。
