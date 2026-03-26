# @openclaw-soul/cli

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
