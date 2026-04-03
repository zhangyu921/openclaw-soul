# @openclaw-soul/cli

## 0.0.10

### Patch Changes

- b2a3bbd: Publish wizard no longer prompts for display title, summary, or avatar; asks whether to upload the full workspace first (default: no). Default display title is derived from IDENTITY Name when present, otherwise the slug. Success output reminds users to edit metadata on the registry site.

  Fix: after interactive 409 confirm, omit `visibility` so replacing a pack no longer forces UNLISTED (preserves gallery listing when already public).

## 0.0.9

### Patch Changes

- 19e1e94: **Breaking:** Non-interactive `publish` default pack subset is now `SOUL.md` plus `IDENTITY.md` when present; `MEMORY.md` is no longer included by default—use `--include MEMORY.md` to opt in.

  - `SOUL.md` remains required for the default flow; wizard and messaging reflect the new defaults.
  - Interactive publish wizard UX updated to match (MEMORY as explicit opt-in where applicable).

## 0.0.8

### Patch Changes

- 8840eed: ### `publish`

  - **默认可见性**：新上传的 pack 默认与 registry 对齐为 **未公开（草稿）**，不会直接出现在画廊；成功后在 TTY 下会提示「当前为草稿」及如何公开。
  - **`--public`**：与 `--replace` 等选项可同时使用；指定后本次上传为 **公开上架**（registry 侧 `LISTED`）。
  - **`--replace` 且不传 `--public`**：multipart **不传** `visibility` 字段，由服务端 **保留** 该 slug 已有可见性（避免覆盖上传时误改公开状态）。
  - **响应**：解析并校验服务端返回的 `visibility` 字段（若存在）。

  ### `apply`

  - **元数据**：在下载 zip 前会请求 `GET /api/packs/<handle>/<slug>`，以判断 pack 是否 **未公开**；未公开 pack 需能证明作者身份。
  - **`--token`**：可选，等价于环境变量 **`OPENCLAW_SOUL_TOKEN`**；拉取 **未公开** pack 时 **必须** 提供（与下载接口 Bearer 一致）。
  - **TTY**：若目标为未公开 pack，在原有确认前会提示「当前为草稿 / 将使用 token 下载」。
  - **下载**：对 **未公开** pack 的 zip 请求会携带 **`Authorization: Bearer <token>`**；**已公开** pack 仍为匿名下载，行为与此前一致。

  ### 其它

  - 新增内部模块 `registry-pack-meta.ts`（封装 registry pack 元数据拉取）；`downloadToFile` 支持可选 `RequestInit`（用于带鉴权下载）。

## 0.0.7

### Patch Changes

- 5fe07d7: 移除 `download`、`import` 子命令；删除仓库内 `example-pack` 示例（若此前脚本依赖该命令，请改用 `apply <handle>/<slug>`）。CLI 帮助与文档已同步；`publish` 向导使用的根文件白名单迁至 `workspace-root-files.ts`。

## 0.0.6

### Patch Changes

- 2467ee2: - device-login: clearer localhost vs user `env` path; on connection failures (refused / timeout / transient) suggest updating CLI (`@latest`).
  - docs: roadmap merged into `docs/ROADMAP.md` (showcase + CLI/registry follow-ups).

## 0.0.5

### Patch Changes

- 51a4b63: When `OPENCLAW_SOUL_API` is unset after `loadCliEnv()`, the CLI always uses `DEFAULT_OPENCLAW_SOUL_API` (production). Local monorepo dev: set `OPENCLAW_SOUL_API` in root `.env.cli` (see `.env.cli.example`) or the shell. Removed implicit localhost defaults and related heuristics.

## 0.0.4

### Patch Changes

- 0652667: Fix default API base when using `npx` from inside the repo: use production registry unless the running CLI is the workspace `node_modules/@openclaw-soul/cli` install (not the npx cache copy).

## 0.0.3

### Patch Changes

- 79e024b: - **默认 registry**：未设置 `OPENCLAW_SOUL_API` 时，从 npm / `npx` 安装的 CLI 默认使用线上 **`https://openclaw-soul.basilfield.com`**；在本 monorepo 内开发仍默认 `http://localhost:3000`（见 `packages/cli/src/constants.ts`）。
  - **device-login**：连接被拒时区分 localhost 与线上 origin 的提示文案。
  - **文档**：根 README、`packages/cli/README`、`web/.env.example` 同步说明默认 URL。

## 0.0.2

### Patch Changes

- 713d2cf: - **发布与 CI**：`@openclaw-soul/cli` 具备 npm 元数据（`files`、`engines`、`publishConfig` 等）；根目录接入 Changesets；GitHub Actions 在合并 Version PR 后执行 `pnpm run release`（build + `changeset publish`）并推送 `cli-v{semver}` 标签；仓库需配置 Secret **`NPM_TOKEN`**。
  - **依赖**：用 **`yazl`** 替代 **`archiver`** 生成 zip，去掉传递依赖里的旧版 **`glob`**，消除安装时的弃用警告。
  - **CLI 体验**：无子命令时仅在 **stdout** 打印帮助并以退出码 **0** 结束，避免终端将帮助当成 stderr 红色错误。
  - **文档**：根目录 README 与 `packages/cli/README.md` 补充 npm / npx 用法及维护者发版步骤。
