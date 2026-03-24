# OpenClaw Soul

Registry + CLI for sharing and applying **OpenClaw workspace** packs (full zip, including `MEMORY.md` if present).

- **Web** (`web/`): Next.js gallery, register/login, API tokens, upload/download packs.
- **CLI** (`packages/cli`, root `npm run ocs` / `bin`): `ocs` — `login`, `apply`, `publish`, `download`, `import`, `archive-directory`, `restore-openclaw-config`, `backup-openclaw-config`.

Docs: [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace).

## Quick start (local)

From monorepo root:

```bash
npm install
cd web
cp .env.example .env
npx prisma db push
npm run dev
```

Web 使用 **Prisma ORM 7**：`prisma.config.ts` 提供数据源 URL；运行时通过 `@prisma/adapter-better-sqlite3` 连接 SQLite。构建前会执行 `prisma generate`，客户端生成到 `web/src/generated/prisma`（已 `.gitignore`）。

Open http://localhost:3000 — register. **在 monorepo 根目录**（无需先 `cd packages/cli`、也无需先 build CLI）：

**推荐：浏览器登录（类 OAuth device flow）**

```bash
npm run ocs -- login
```

会打开浏览器，在站点上登录并确认后，CLI 轮询拿到 token；若在仓库根目录会自动写入 `.env.cli`（已存在 `OPENCLAW_SOUL_TOKEN` 时需加 `--force` 覆盖）。

**或** 在 `/dashboard/tokens` 手动创建 token，复制到 `.env.cli`（见 `.env.cli.example`）。

**发布**

```bash
# 交互式（TTY）：未带齐 --slug 与 --title 时会问答，缺 token 时会自动走浏览器登录
npm run ocs -- publish

# 自动化 / CI：必须同时带齐 slug、title；token 用环境变量或 --token
npm run ocs -- publish --slug my-pack --title "My pack" --source current
# 指定目录（相对路径会解析 monorepo 根）：
# npm run ocs -- publish --slug my-pack --title "My pack" --source ./example-pack
```

非 TTY（如 CI）下若未同时提供 `--slug` 与 `--title`，或没有 `OPENCLAW_SOUL_TOKEN`/`--token`，命令会直接报错退出（不会挂住）。

根目录 `npm run ocs` 通过 `tsx` 直接跑 `packages/cli/src`；`.env.cli` 在进程启动时自动加载（已 `.gitignore`）。

**Manifest-only install**（白名单文件拷入已有 workspace，不下载 zip）：

```bash
npm run ocs -- import ./example-pack --target ~/.openclaw/workspace
# 加 --dry-run 只看将要复制的路径
```

Apply 已发布的 pack（若已有 `~/.openclaw/workspace-<slug>` 会先改名备份，并更新 `openclaw.json`；JSON5 写回**仍无法保留原文件注释**）：

```bash
npm run ocs -- apply my-pack
```

环境变量（可写进根目录 `.env.cli`，或照常 `export`）：

- `OPENCLAW_SOUL_API` — registry base URL（默认 `http://localhost:3000`）
- `OPENCLAW_SOUL_TOKEN` — `publish` 用 API token
- `OPENCLAW_CONFIG` — `openclaw.json` 路径（默认 `~/.openclaw/openclaw.json`）

若使用根目录 `package.json` 的 `bin`（`npx ocs` / `npm link`），需先执行一次 `npm run build -w @openclaw-soul/cli`（走编译后的 `dist`）。

Uploaded files are stored under `web/storage/` unless `STORAGE_PATH` is set.

**备份 / 改名（无 rm）**

```bash
npm run ocs -- archive-directory ~/.openclaw/workspace-demo
npm run ocs -- backup-openclaw-config
npm run ocs -- restore-openclaw-config --list
npm run ocs -- restore-openclaw-config --latest
# npm run ocs -- restore-openclaw-config --from ~/.openclaw/openclaw.json.bak.2026-03-24T12-00-00-000Z
```

登录后打开某个 pack 详情页，**作者**可见「Upload / replace avatar」；也可在 `publish` 时带 `--avatar`。

## Monorepo

```bash
npm install          # root workspaces
npm run build        # CLI + web
npm run dev          # web dev server
```

Global CLI after `npm link` inside `packages/cli`, or use `npx` once published.

## Privacy

Publishing sends the **entire** directory as zip. You are responsible for what you upload.
