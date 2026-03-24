# OpenClaw Soul

Registry + CLI for sharing and applying **OpenClaw workspace** packs (full zip, including `MEMORY.md` if present).

- **Web** (`web/`): Next.js gallery, register/login, API tokens, upload/download packs.
- **CLI** (`packages/cli`, root `pnpm run ocs -- …` / `bin`): `ocs` — `login`, `apply`, `publish`, `download`, `import`, `archive-directory`, `restore-openclaw-config`, `backup-openclaw-config`.

Docs: [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace).

## Quick start (local)

Monorepo 使用 **pnpm**（见根目录 `packageManager` 与 `pnpm-workspace.yaml`；可选先执行 `corepack enable`）。在仓库根目录：

```bash
pnpm install
docker compose up -d
cd web
cp .env.example .env
pnpm exec prisma migrate dev
cd ..
pnpm run dev
```

Web 使用 **Prisma ORM 7** + **PostgreSQL**（`docker-compose.yml` 将容器 `5432` 映射到本机 **`55432`**，避免与本机已有 Postgres 冲突；可在 compose 里改端口）。`prisma.config.ts` 提供默认 `DATABASE_URL`；运行时用 `@prisma/adapter-pg` + `pg` Pool。构建会执行 `prisma generate`，客户端在 `web/src/generated/prisma`（已 `.gitignore`）。

生产部署步骤见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

Open http://localhost:3000 — **注册时需填写 public handle**（全站唯一，用于 `/packs/<handle>/<slug>` 与 CLI `apply`）。**在 monorepo 根目录**（无需先 `cd packages/cli`、也无需先 build CLI）：

**推荐：浏览器登录（类 OAuth device flow）**

```bash
pnpm run ocs -- login
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

**数据库**：表结构变更请用 `cd web && pnpm exec prisma migrate dev`（开发）或 `pnpm exec prisma migrate deploy`（CI/生产）。勿在生产对已有数据随意 `db push`。

**发布**

```bash
# 交互式（TTY）：未带 --slug 时会引导选择目录，并从 IDENTITY.md 的 Name 建议 slug/title
pnpm run ocs -- publish

# 自动化 / CI：必须提供 --slug；--title 可省略（会用 IDENTITY Name 或回退为 slug）；token 用环境变量或 --token
pnpm run ocs -- publish --slug my-pack --source current
# pnpm run ocs -- publish --slug my-pack --title "My pack" --source ./example-pack
```

非 TTY 下若未提供 `--slug`，或没有 `OPENCLAW_SOUL_TOKEN`/`--token`，命令会直接报错退出（不会挂住）。

`publish` 成功后仅在 **stderr** 打印可点击查看的 pack 页面完整 URL。

若服务端返回 **409**（你已用过该 `slug`）：交互模式下会询问是否**覆盖**（仅更新 ZIP、标题、摘要；`--avatar` 未传则保留原头像；URL 不变）。非交互请显式加 **`--replace`**。

根目录 `pnpm run ocs -- …` 经 `scripts/run-ocs.mjs` 在 `packages/cli` 下用 `tsx` 跑源码；启动时会按上表加载用户 `env` 与可选的 `.env.cli`（已 `.gitignore`）。

**Manifest-only install**（白名单文件拷入已有 workspace，不下载 zip）：

```bash
pnpm run ocs -- import ./example-pack --target ~/.openclaw/workspace
# 加 --dry-run 只看将要复制的路径
```

Apply 已发布的 pack（`ref` = 作者的 **handle** + **pack slug**，若已有 `~/.openclaw/workspace-<slug>` 会先改名备份，并更新 `openclaw.json`；**读**仍用 JSON5。**写**：若文件为合法 **JSONC**（标准 JSON + `//` / `/* */` 注释、尾随逗号等），CLI 用 `jsonc-parser` 只改 `agent.workspace` 与 `agents.defaults.workspace`，**尽量保留注释与排版**；若解析失败（例如含 JSON5 专有条目如无引号键），则回退为整文件 **JSON.stringify**（注释会丢失）：

```bash
pnpm run ocs -- apply alice/my-pack
# 终端（TTY）会先列出完整路径并确认；脚本或非交互可加 -y / --yes 跳过确认
# 详细日志：--debug
```

默认 **stderr**：TTY 下先**确认**（Registry、下载 URL、解压目录、将使用的备份路径、`openclaw.json` 绝对路径）；完成后打印**完整**备份路径与配置路径。**stdout** 仍仅一行工作区绝对路径。`--debug` 打开更细的 **stderr**。

环境变量（推荐 `export` 或写入用户 `env`；在 monorepo 内也可用 `.env.cli` 覆盖开发值）：

- `OPENCLAW_SOUL_API` — registry base URL（默认 `http://localhost:3000`）
- `OPENCLAW_SOUL_TOKEN` — `publish` 用 API token
- `OPENCLAW_SOUL_CONFIG_DIR` — 自定义 CLI 配置目录（其下文件名为 `env`）
- `OPENCLAW_CONFIG` — `openclaw.json` 路径（默认 `~/.openclaw/openclaw.json`）
- `OPENCLAW_SOUL_CONNECT_TIMEOUT_MS` — CLI 连 registry 的 TCP 连接超时（默认 `60000`；Node 内置 `fetch` 仅约 10s，易在访问 Vercel 时超时）
- `OPENCLAW_SOUL_HEADERS_TIMEOUT_MS` — 默认 `60000`
- `OPENCLAW_SOUL_BODY_TIMEOUT_MS` — 读/写 body（如上传 zip）超时，默认 `300000`
- `OPENCLAW_SOUL_FETCH_MAX_RETRIES` — 对弱网/断连的自动重试次数（默认 `3`，最大 `8`）
- `HTTPS_PROXY` / `HTTP_PROXY` — CLI 内 undici 会走代理（与浏览器分开时，若浏览器能上站而终端不能，可在终端设此变量）

若使用根目录 `package.json` 的 `bin`（`npx ocs` / `pnpm link --global` 在 `packages/cli`），需先执行一次 `pnpm --filter @openclaw-soul/cli build`（走编译后的 `dist`）。

Uploaded files：默认在 `web/storage/`（可用 `STORAGE_PATH`）。生产 Serverless 建议设置 **`BLOB_READ_WRITE_TOKEN`**（或 `STORAGE_DRIVER=vercel-blob`）使用 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)；此时 DB 中 zip/头像字段存 Blob 的 **https URL**。

**备份 / 改名（无 rm）**

```bash
pnpm run ocs -- archive-directory ~/.openclaw/workspace-demo
pnpm run ocs -- backup-openclaw-config
pnpm run ocs -- restore-openclaw-config --list
pnpm run ocs -- restore-openclaw-config --latest
# pnpm run ocs -- restore-openclaw-config --from ~/.openclaw/openclaw.json.bak.2026-03-24T12-00-00-000Z
```

登录后打开某个 pack 详情页，**作者**可见「Upload / replace avatar」；也可在 `publish` 时带 `--avatar`。

## Monorepo

```bash
pnpm install         # workspace（lockfile: pnpm-lock.yaml）
pnpm run build       # CLI + web
pnpm run dev         # web dev server
```

选用 **pnpm** 的原因之一：在 CI / Vercel（Linux）上 **Tailwind v4 的 `@tailwindcss/oxide` / `lightningcss` 等平台可选原生依赖** 用 npm workspaces 时容易装不齐（[npm#4828](https://github.com/npm/cli/issues/4828)），pnpm 更稳，因而不必在 `package.json` 里手写 `*-linux-x64-gnu` 的 pin。

Global CLI：`cd packages/cli && pnpm link --global`，或发布后使用 `npx`。

## Troubleshooting

- **`device/start failed (500)`**（`ocs login` / 交互 `publish`）：多为数据库未迁移。确保 `docker compose up -d` 且 `DATABASE_URL` 正确，执行 `cd web && pnpm exec prisma migrate dev`（或生产 `migrate deploy`），重启 `pnpm run dev` 再试。

## Privacy

- 完整说明与同意条款：站点路径 **`/privacy`**（本地即 `http://localhost:3000/privacy`）。
- 注册须勾选同意；`ocs publish` 在 TTY 下会提示（同意后写入 `~/.config/openclaw-soul/privacy-ack`，不必每次确认）；**非 TTY / CI** 须加 **`--accept-privacy`** 或环境变量 **`OPENCLAW_SOUL_ACCEPT_PRIVACY=1`**。
- **体积**：pack **zip ≤ 2 MiB**；头像服务端上限 **≤ 512 KiB**，**网页与 `ocs publish` 会在上传前自动压缩**（不占服务器算力），极难仍超限时再换图。
- **频率**：同一账号约 **每自然小时 20 次**成功发布（新建或覆盖）；超限返回 **429**。
- 作者可在 pack 详情页 **撤销公开展示**（不删数据库与文件；`ocs publish --replace` 同 slug 可再次公开）。

Publishing still sends the **entire** workspace as zip unless you exclude files locally; you are responsible for what you upload.
