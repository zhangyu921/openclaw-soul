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

若曾在 `~/.config/openclaw-soul/env`（或 Windows 对应目录）里写入过 **`OPENCLAW_SOUL_API=http://localhost:3000`**，用 **npm/npx 安装** 的 CLI 会忽略该值并仍连线上（避免旧版本误写入导致连不上）。若你确实要让全局安装的 CLI 连本机 3000，请使用 **`ocs login --api http://localhost:3000`**，或设置 **`OPENCLAW_SOUL_ALLOW_LOCALHOST=1`** 后再保留 env 里的 localhost。

## Docs

- Monorepo README: [openclaw-soul](https://github.com/zhangyu921/openclaw-soul/blob/main/README.md)
- OpenClaw workspace: [Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace)

## Development

From the repo root, use `pnpm run ocs -- …` (see root `README.md`).
