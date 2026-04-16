# 本地开发与 monorepo

本文面向**克隆本仓库**的贡献者与维护者；终端用户只需 npm 上的 CLI，见根目录 [`README.md`](../README.md)。

AI / 协作者请先读根目录 [`AGENTS.md`](../AGENTS.md)（使命、约束与领域速查）。仅改 `web/` 时配合 [`web/AGENTS.md`](../web/AGENTS.md)。

---

## Quick start（本地）

Monorepo 使用 **pnpm**（根目录 `packageManager` 与 `pnpm-workspace.yaml`；可选 `corepack enable`）。在仓库根目录：

```bash
pnpm install
docker compose up -d
cd web
cp .env.example .env
pnpm exec prisma migrate dev
cd ..
pnpm run dev
```

Web：**Prisma ORM 7** + **PostgreSQL**（`docker-compose.yml` 将容器 `5432` 映射到本机 **`55432`**，避免与本机已有 Postgres 冲突；可在 compose 里改端口）。`prisma.config.ts` 提供默认 `DATABASE_URL`；运行时用 `@prisma/adapter-pg` + `pg` Pool。构建会执行 `prisma generate`，客户端在 `web/src/generated/prisma`（已 `.gitignore`）。

生产部署见 [`DEPLOY.md`](DEPLOY.md)。产品与路线图见 [`ROADMAP.md`](ROADMAP.md)。

打开 http://localhost:3000 — **注册时需填写 public handle**（全站唯一，用于 `/packs/<handle>/<slug>` 与 CLI `apply`）。**在 monorepo 根目录**（无需先 `cd packages/cli`、也无需先 build CLI）：

### Pack 即时 chat（详情页）

「与 pack 对话」使用 **Vercel AI SDK**。在 **`web/.env`** 中**任选其一**（见 `web/.env.example`）：

- **本地 Ollama**：设置 **`OLLAMA_BASE_URL`**（例如 `http://127.0.0.1:11434`，无尾斜杠亦可）；可选 **`OLLAMA_MODEL`**（默认 **`qwen2:7b-instruct`**）。
- **MiniMax Token Plan**：设置 **`MINIMAX_TOKEN_PLAN_API_KEY`**（控制台「Token Plan Key」）；可选 **`MINIMAX_ANTHROPIC_BASE_URL`**（默认国内 **`https://api.minimaxi.com/anthropic/v1`**）、**`MINIMAX_CHAT_MODEL`**（默认 **`MiniMax-M2.7`**）。走 MiniMax [Compatible Anthropic API](https://platform.minimax.io/docs/api-reference/text-anthropic-api)（`@ai-sdk/anthropic` + `Authorization: Bearer`）。Token Plan 专用 Key 与按量付费 Key 不通用。

若 **`OLLAMA_BASE_URL`** 已设置则优先 Ollama；否则若配置了 **`MINIMAX_TOKEN_PLAN_API_KEY`** 则走 MiniMax。均未配置时 **`POST /api/packs/.../chat`** 返回 **503**。

### 推荐：浏览器登录（类 OAuth device flow）

```bash
pnpm run ocs -- login
```

会打开浏览器，在站点上登录并确认后，CLI 轮询拿到 token，并写入**用户级**配置文件（见下）；若已存在 `OPENCLAW_SOUL_TOKEN` 需加 `--force` 覆盖（终端用户：`npx @openclaw-soul/cli login --force`）。交互式 `publish` 里若触发浏览器登录，成功后同样写入该文件。

**或** 在 `/dashboard/tokens` 手动创建 token，粘贴进用户配置 `env` 文件中的 `OPENCLAW_SOUL_TOKEN=`（见根目录 `.env.cli.example`）。若账号尚无 handle（旧数据），需在同一页**一次性设置 public handle** 后才能 `publish`。

### CLI 凭证加载顺序（production 优先）

1. Shell / CI 已设置的**环境变量**（不被文件覆盖）。
2. **用户配置** `env`（`npx @openclaw-soul/cli login` 或 `publish` 时浏览器登录后写入）：
   - macOS / Linux：`~/.config/openclaw-soul/env`（若设置 `XDG_CONFIG_HOME` 则为 `$XDG_CONFIG_HOME/openclaw-soul/env`）
   - Windows：`%APPDATA%\openclaw-soul\env`
   - 可选：设置 `OPENCLAW_SOUL_CONFIG_DIR` 指向目录时，使用该目录下的 `env`。
3. 若当前目录在 **本 monorepo** 内且存在根目录 **`.env.cli`**：后加载并**覆盖**上述同名变量（仅本地开发指向 `localhost` 等）。见 `.env.cli.example`。

从旧版升级、此前只在仓库用过 `.env.cli`：可把其中内容合并进 `~/.config/openclaw-soul/env`，或再执行一次 `npx @openclaw-soul/cli login`（本仓库开发可用 `pnpm run ocs -- login`）。

**数据库**：表结构变更请用 `cd web && pnpm exec prisma migrate dev`（开发）或 `pnpm exec prisma migrate deploy`（CI/生产）。勿在生产对已有数据随意 `db push`。

---

## `pnpm run ocs` 与源码运行

根目录 **`pnpm run ocs -- …`** 经 `scripts/run-ocs.mjs` 在 `packages/cli` 下用 `tsx` 跑源码；启动时会按上节加载用户 `env` 与可选的 `.env.cli`（已 `.gitignore`）。无需先 `pnpm --filter @openclaw-soul/cli build`。

若使用根目录 `package.json` 的 `bin`（`npx ocs` / `pnpm link --global` 在 `packages/cli`），需先执行一次 `pnpm --filter @openclaw-soul/cli build`（走编译后的 `dist`）。

---

## `publish`（开发时常用）

未加 **`--full`** 且未由向导指定根文件时，非交互默认子集为 workspace **根目录**的 **`SOUL.md`** +（若存在）**`IDENTITY.md`**，并与 **`--include`** 列表合并去重；**不**默认包含 `MEMORY.md`，需要时加 **`--include MEMORY.md`** 或在交互向导中勾选。在已知源目录后，若根目录**没有** `SOUL.md` 文件则报错退出。**`--full`** 打包整 workspace 目录；**`--include`** 可重复指定额外根文件（如 `MEMORY.md`、`AGENTS.md`）。

交互式向导（TTY）：**「整个 workspace 目录」**（等同 `--full`）在选项列表**第一位**、默认不勾选。子集模式下 **`SOUL.md` 必选**不可取消；**`IDENTITY.md`** 若存在则默认勾选，不存在则禁用；**`MEMORY.md`** 与其余可选根文件**默认不勾选**。勾选整目录后，其余根文件项变为不可选并显示为已勾选（表示整包纳入），仅可取消整目录以回到子集。

```bash
# 交互式（TTY）：未带 --slug 时会引导选择目录，并从 IDENTITY.md 的 Name 建议 slug；先问是否整 workspace（默认否），再问根文件。不向终端询问展示标题/摘要/头像（默认标题：IDENTITY Name 否则 slug；展示信息可在站点改）
pnpm run ocs -- publish

# 自动化 / CI：必须提供 --slug；--title 可省略（会用 IDENTITY Name 或回退为 slug）；token 用环境变量或 --token
# 默认子集：SOUL.md + 若存在则 IDENTITY.md；MEMORY 需 --include MEMORY.md
pnpm run ocs -- publish --slug my-pack --source current
# pnpm run ocs -- publish --slug my-pack --title "My pack" --source ./path/to/workspace
# 整目录 zip：pnpm run ocs -- publish --slug my-pack --source current --full
# 附加根文件（含 MEMORY）：pnpm run ocs -- publish --slug my-pack --source current --include MEMORY.md --include AGENTS.md --include TOOLS.md
```

非 TTY 下若未提供 `--slug`，或没有 `OPENCLAW_SOUL_TOKEN`/`--token`，命令会直接报错退出（不会挂住）。

`publish` 成功后仅在 **stderr** 打印可点击查看的 pack 页面完整 URL（服务端返回的 **`viewUrl`**，优先于用 `OPENCLAW_SOUL_API` 拼接；生产请配 **`OPENCLAW_SOUL_SITE_URL`** 与主域一致），并提示可在网页修改展示标题、简介、头像与上架。

若服务端返回 **409**（你已用过该 `slug`）：交互模式下会询问是否**覆盖**（仅更新 ZIP、标题、摘要；`--avatar` 未传则保留原头像；URL 不变）。非交互请显式加 **`--replace`**。

**`publish --avatar`**：CLI 依赖 **`sharp`**（本机压缩头像至 512 KiB 内再上传）；安装失败时请检查平台是否支持该原生依赖。

---

## `apply`

从 registry 安装已发布的 pack（`ref` = 作者的 **handle** + **pack slug**）。若已有 `~/.openclaw/workspace-<slug>` 会先改名备份，并更新 `openclaw.json`；**读**仍用 JSON5。**写**：只设置 **`agents.defaults.workspace`**（与 [OpenClaw Agent Workspace](https://docs.openclaw.ai/concepts/agent-workspace) 中推荐路径一致；**不再**写入旧版 `agent.workspace`，以免触发新版校验里的 legacy 键告警）。若文件为合法 **JSONC**（标准 JSON + `//` / `/* */` 注释、尾随逗号等），CLI 用 `jsonc-parser` **只改该字段**，尽量保留注释与排版；若解析失败（例如含 JSON5 专有条目如无引号键），则回退为整文件 **JSON.stringify**（注释会丢失）：

```bash
pnpm run ocs -- apply alice/my-pack
# 终端（TTY）会先列出完整路径并确认；脚本或非交互可加 -y / --yes 跳过确认
# 详细日志：--debug
```

默认 **stderr**：TTY 下先**确认**（Registry、下载 URL、解压目录、将使用的备份路径、`openclaw.json` 绝对路径）；完成后打印**完整**备份路径与配置路径。**stdout** 仍仅一行工作区绝对路径。`--debug` 打开更细的 **stderr**。

---

## 环境变量（CLI）

推荐 `export` 或写入用户 `env`；在 monorepo 内也可用 `.env.cli` 覆盖开发值。

- `OPENCLAW_SOUL_API` — registry base URL。未设置时（含 CI）默认 **`https://openclaw-soul.basilfield.com`**（见 `packages/cli/src/constants.ts`）。在本仓库连本地站点请在根目录配置 `.env.cli`（见 `.env.cli.example`）。
- `OPENCLAW_SOUL_SITE_URL` — 可选；生产建议设为对外主域（`https://…`，无尾 `/`）。用于浏览器里 device 授权链接、**`publish` 成功时打印的 pack 页 `viewUrl`**（避免一直显示 `*.vercel.app`），以及站内依赖 canonical origin 的片段；详见 [`DEPLOY.md`](DEPLOY.md)。
- `OPENCLAW_SOUL_TOKEN` — `publish` 用 API token
- `OPENCLAW_SOUL_CONFIG_DIR` — 自定义 CLI 配置目录（其下文件名为 `env`）
- `OPENCLAW_CONFIG` — `openclaw.json` 路径（默认 `~/.openclaw/openclaw.json`）
- `OPENCLAW_SOUL_CONNECT_TIMEOUT_MS` — CLI 连 registry 的 TCP 连接超时（默认 `60000`；Node 内置 `fetch` 仅约 10s，易在访问 Vercel 时超时）
- `OPENCLAW_SOUL_HEADERS_TIMEOUT_MS` — 默认 `60000`
- `OPENCLAW_SOUL_BODY_TIMEOUT_MS` — 读/写 body（如上传 zip）超时，默认 `300000`
- `OPENCLAW_SOUL_FETCH_MAX_RETRIES` — 对弱网/断连的自动重试次数（默认 `3`，最大 `8`）
- `HTTPS_PROXY` / `HTTP_PROXY` — CLI 内 undici 会走代理（与浏览器分开时，若浏览器能上站而终端不能，可在终端设此变量）

---

## 存储与上传（服务端）

Uploaded files：默认在 `web/storage/`（可用 `STORAGE_PATH`）。生产 Serverless 建议设置 **`BLOB_READ_WRITE_TOKEN`**（或 `STORAGE_DRIVER=vercel-blob`）使用 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)；此时 DB 中 zip/头像字段存 Blob 的 **https URL**。

登录后打开某个 pack 详情页，**作者**可见「Upload / replace avatar」；也可在 `publish` 时带 `--avatar`。

---

## 备份 / 改名（无 rm）

```bash
pnpm run ocs -- archive-directory ~/.openclaw/workspace-demo
pnpm run ocs -- backup-openclaw-config
pnpm run ocs -- restore-openclaw-config --list
pnpm run ocs -- restore-openclaw-config --latest
# pnpm run ocs -- restore-openclaw-config --from ~/.openclaw/openclaw.json.bak.2026-03-24T12-00-00-000Z
```

---

## Monorepo 脚本

```bash
pnpm install         # workspace（lockfile: pnpm-lock.yaml）
pnpm run build       # CLI + web
pnpm run dev         # web dev server
```

选用 **pnpm** 的原因之一：在 CI / Vercel（Linux）上 **Tailwind v4 的 `@tailwindcss/oxide` / `lightningcss` 等平台可选原生依赖** 用 npm workspaces 时容易装不齐（[npm#4828](https://github.com/npm/cli/issues/4828)），pnpm 更稳，因而不必在 `package.json` 里手写 `*-linux-x64-gnu` 的 pin。

Global CLI：`cd packages/cli && pnpm link --global`，或发布后使用 `npx`。

---

## 发布 `@openclaw-soul/cli`（维护者）

**勿手改** `packages/cli/package.json` 里的 **version** 或 **`CHANGELOG.md` 里的版本小节**：只通过 **`pnpm changeset`**（或手写提交 `.changeset/*.md`）写变更说明；合并 **Version Packages** PR 时由 **Changesets** 自动 bump 版本并更新 changelog。

1. 在本分支写好改动后执行 **`pnpm changeset`**，为 `@openclaw-soul/cli` 写一条 changeset，提交并合并到 **`main`**。
2. GitHub Actions（[`release.yml`](../.github/workflows/release.yml)）会开 **Version Packages** PR；合并后再次推到 `main` 时会 **`pnpm run release`**（build CLI + `changeset publish`）发布到 npm。
3. 发布成功后同一 workflow 会打 git 标签 **`cli-v{semver}`**（与 npm 上 CLI 版本一致，便于与仓库内其它产物区分）。
4. **npm 发布（Trusted Publishing / OIDC）**：在 [npm 包设置](https://www.npmjs.com/) 里打开 **`@openclaw-soul/cli` → Package settings → Trusted publishing**，选择 **GitHub Actions**，填写本仓库 **`zhangyu921/openclaw-soul`**，**Workflow filename** 填 **`release.yml`**（须与 [`.github/workflows/release.yml`](../.github/workflows/release.yml) 文件名一致）。CI 通过 OIDC 换短期凭证发布，**不需要**在 GitHub 配置 **`NPM_TOKEN`**。详见 [npm Trusted publishing](https://docs.npmjs.com/trusted-publishers)。若仓库为 **private**，provenance 会有 [已知限制](https://github.blog/changelog/2023-07-25-publishing-with-npm-provenance-from-private-source-repositories-is-no-longer-supported/)。

---

## Troubleshooting

- **`device/start failed (500)`**（`npx @openclaw-soul/cli login` / 交互 `publish`）：多为数据库未迁移。确保 `docker compose up -d` 且 `DATABASE_URL` 正确，执行 `cd web && pnpm exec prisma migrate dev`（或生产 `migrate deploy`），重启 `pnpm run dev` 再试。
