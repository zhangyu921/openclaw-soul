# @openclaw-soul/cli

CLI for **[OpenClaw Soul](https://github.com/zhangyu921/openclaw-soul)** — register, publish, and apply **OpenClaw workspace** packs (`ocs`).

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
