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

Open http://localhost:3000 — **注册时需填写 public handle**（全站唯一，用于 `/packs/<handle>/<slug>` 与 CLI `apply`）。**在 monorepo 根目录**（无需先 `cd packages/cli`、也无需先 build CLI）：

**推荐：浏览器登录（类 OAuth device flow）**

```bash
npm run ocs -- login
```

会打开浏览器，在站点上登录并确认后，CLI 轮询拿到 token，并写入**用户级**配置文件（见下）；`ocs login` 若已存在 `OPENCLAW_SOUL_TOKEN` 需加 `--force` 覆盖。交互式 `publish` 里若触发浏览器登录，成功后同样写入该文件，之后再次 `publish` 会直接使用该 token。

**或** 在 `/dashboard/tokens` 手动创建 token，粘贴进用户配置 `env` 文件中的 `OPENCLAW_SOUL_TOKEN=`（见 `.env.cli.example` 说明）。若账号尚无 handle（旧数据），需在同一页**一次性设置 public handle** 后才能 `publish`。

**CLI 凭证加载顺序（production 优先）**

1. Shell / CI 已设置的**环境变量**（不被文件覆盖）。
2. **用户配置** `env`（`ocs login` / `publish` 登录后写入）：
   - macOS / Linux：`~/.config/openclaw-soul/env`（若设置 `XDG_CONFIG_HOME` 则为 `$XDG_CONFIG_HOME/openclaw-soul/env`）
   - Windows：`%APPDATA%\openclaw-soul\env`
   - 可选：设置 `OPENCLAW_SOUL_CONFIG_DIR` 指向目录时，使用该目录下的 `env`。
3. 若当前目录在 **本 monorepo** 内且存在根目录 **`.env.cli`**：后加载并**覆盖**上述同名变量（仅本地开发指向 `localhost` 等）。见 `.env.cli.example`。

从旧版升级、此前只在仓库用过 `.env.cli`：可把其中内容合并进 `~/.config/openclaw-soul/env`，或再执行一次 `ocs login`。

**数据库**：`Pack.slug` 改为「同一作者内唯一」、并新增 `User.handle` 时，本地 SQLite 可执行 `cd web && npx prisma db push --accept-data-loss`（若提示唯一约束冲突请先备份）。生产环境请用迁移策略，勿随意丢数据。

**发布**

```bash
# 交互式（TTY）：未带 --slug 时会引导选择目录，并从 IDENTITY.md 的 Name 建议 slug/title
npm run ocs -- publish

# 自动化 / CI：必须提供 --slug；--title 可省略（会用 IDENTITY Name 或回退为 slug）；token 用环境变量或 --token
npm run ocs -- publish --slug my-pack --source current
# npm run ocs -- publish --slug my-pack --title "My pack" --source ./example-pack
```

非 TTY 下若未提供 `--slug`，或没有 `OPENCLAW_SOUL_TOKEN`/`--token`，命令会直接报错退出（不会挂住）。

`publish` 成功后仅在 **stderr** 打印可点击查看的 pack 页面完整 URL。

根目录 `npm run ocs` 通过 `tsx` 直接跑 `packages/cli/src`；启动时会按上表加载用户 `env` 与可选的 `.env.cli`（已 `.gitignore`）。

**Manifest-only install**（白名单文件拷入已有 workspace，不下载 zip）：

```bash
npm run ocs -- import ./example-pack --target ~/.openclaw/workspace
# 加 --dry-run 只看将要复制的路径
```

Apply 已发布的 pack（`ref` = 作者的 **handle** + **pack slug**，若已有 `~/.openclaw/workspace-<slug>` 会先改名备份，并更新 `openclaw.json`；JSON5 写回**仍无法保留原文件注释**）：

```bash
npm run ocs -- apply alice/my-pack
```

环境变量（推荐 `export` 或写入用户 `env`；在 monorepo 内也可用 `.env.cli` 覆盖开发值）：

- `OPENCLAW_SOUL_API` — registry base URL（默认 `http://localhost:3000`）
- `OPENCLAW_SOUL_TOKEN` — `publish` 用 API token
- `OPENCLAW_SOUL_CONFIG_DIR` — 自定义 CLI 配置目录（其下文件名为 `env`）
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

## Troubleshooting

- **`device/start failed (500)`** when running `ocs login` / interactive `publish`: almost always the DB schema is behind. From repo root run `npm run db:push` (or `cd web && npx prisma db push`), restart `npm run dev`, then try again.

## Privacy

Publishing sends the **entire** directory as zip. You are responsible for what you upload.
