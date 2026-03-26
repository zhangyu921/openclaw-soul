# @openclaw-soul/cli

CLI for **[OpenClaw Soul](https://github.com/zhangyu921/openclaw-soul)** — register, publish, and apply **OpenClaw workspace** packs (`ocs`).

## Install

```bash
npm install -g @openclaw-soul/cli
# or
pnpm add -g @openclaw-soul/cli
```

Run `ocs --help`. Typical commands: `ocs login`, `ocs publish`, `ocs apply <handle>/<slug>`.

**Registry URL**：在 `loadCliEnv()` 之后若仍无 `OPENCLAW_SOUL_API`，默认连线上 **`https://openclaw-soul.basilfield.com`**（[`constants.ts`](https://github.com/zhangyu921/openclaw-soul/blob/main/packages/cli/src/constants.ts)）。自建 registry 请设环境变量或 `--api`。

**在本仓库开发**：将根目录 [`.env.cli.example`](https://github.com/zhangyu921/openclaw-soul/blob/main/.env.cli.example) 复制为 `.env.cli`，并设置 `OPENCLAW_SOUL_API` 指向本地站点（示例为 `http://localhost:3000`）；未配置时 CLI 与 CI 一样默认连线上。

## Docs

- Monorepo README: [openclaw-soul](https://github.com/zhangyu921/openclaw-soul/blob/main/README.md)
- OpenClaw workspace: [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)

## Development

From the repo root, use `pnpm run ocs -- …` (see root `README.md`).
