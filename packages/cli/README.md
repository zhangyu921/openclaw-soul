# @openclaw-soul/cli

CLI for **[OpenClaw Soul](https://github.com/zhangyu921/openclaw-soul)** — register, publish, and apply **OpenClaw workspace** packs (`ocs`).

## Install

```bash
npm install -g @openclaw-soul/cli
# or
pnpm add -g @openclaw-soul/cli
```

Run `ocs --help`. Typical commands: `ocs login`, `ocs publish`, `ocs apply <handle>/<slug>`.

**Registry URL**：未设置 `OPENCLAW_SOUL_API` 时，默认连线上 **`https://openclaw-soul.basilfield.com`**（与仓库内 [`constants.ts`](https://github.com/zhangyu921/openclaw-soul/blob/main/packages/cli/src/constants.ts) 一致）。自建 registry 时请设置环境变量或 `--api`。

## Docs

- Monorepo README: [openclaw-soul](https://github.com/zhangyu921/openclaw-soul/blob/main/README.md)
- OpenClaw workspace: [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)

## Development

From the repo root, use `pnpm run ocs -- …` (see root `README.md`).
