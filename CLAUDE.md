# OpenClaw Soul — AI 协作上下文

## 项目是什么

为 **OpenClaw** 提供 **人设 / workspace 的社区分享与一键切换**：

1. **Registry + Web（MVP）** — 用户注册登录、画廊展示（可简陋）、为 CLI 签发 **API Token**；存储完整 workspace **zip** 与**头像**（头像可先传后在页面上再配置）。
2. **CLI**（`ocs`；npm：`@openclaw-soul/cli` / 根目录 `pnpm run ocs -- …`）— `apply`、`publish`（`--source current` 或目录路径）、`download`、`import`（`manifest.json` + 白名单 → `--target`）、`archive-directory`、`restore-openclaw-config`、`backup-openclaw-config`；`apply` 与写配置前 **rename / copy 备份**，**不用 `rm`**。

官方 workspace 说明：<https://docs.openclaw.ai/concepts/agent-workspace#default-location>（默认 `~/.openclaw/workspace`，实际路径以本机 `~/.openclaw/openclaw.json` 为准。）

## `manifest.json`

包根目录的 **装箱单**：`schemaVersion`、`pack`（含 `slug` 或可与 `name` 派生目录名）、`files[]`（`src` → `dest`，`dest` 白名单防路径穿越）。Registry 以 **整包 zip** 为主时，可与 manifest 并存，具体字段以实现为准。

仓库内 **`example-pack/`**：示例形状 + 测试用；**不要求**首发脱敏。

## OpenClaw workspace 内常见文件（随 zip 全量携带）

含且不限于：`AGENTS.md`、`SOUL.md`、`USER.md`、`IDENTITY.md`、`MEMORY.md`、`TOOLS.md`、`HEARTBEAT.md`、`memory/` 等。**MVP 不剔除 `MEMORY.md`**，不做敏感扫描；公开分享风险仅在文档中**提示**，脱敏与策略**下一步**再做。

## CLI 行为要点

### `apply`（应用人设）

1. 从 registry **下载** zip。
2. 解压到 **`~/.openclaw/workspace-<slug>`**（如 `workspace-asuka`）。
3. **读取并写回 `~/.openclaw/openclaw.json`**，将 **`agents.defaults.workspace`** 指向上一步目录（OpenClaw 已将原 `agent.*` 迁到 `agents.defaults` / `tools.*`；`apply` **只写** `agents.defaults.workspace`，不碰 legacy `agent.*`）。读配置仍可用 JSON5；写回可能整文件 stringify 时注释会丢。
4. 覆盖或切换前：**rename** 旧目录/旧配置到备份名，**不 `rm -rf`**。

### `publish`（分享）

- 用户**选择打包源**：
  - **当前默认目录**：读取 `openclaw.json` 里正在使用的 workspace 路径（优先 **`agents.defaults.workspace`**，兼容旧版 `agent.workspace`）；或
  - **显式路径**：用户指定目录。
- **默认 zip 范围**：仅 workspace **根**下 `SOUL.md` + `MEMORY.md`（缺一则报错）；**`--full`** 整目录（旧行为）；**`--include`** 重复指定额外根文件（防路径穿越）。交互向导多选：`SOUL.md` 必选，其余可选或选整目录。
- **MVP**：**不做脱敏、不过滤**；默认子集仍可能含 `MEMORY.md`，全量模式与旧版一致。
- **Registry**：用户注册填 **public handle**；pack 的 **slug** 在作者内唯一；画廊与 API 路径为 `/packs/<handle>/<slug>`；CLI `apply <handle>/<slug>`。可选从 `IDENTITY.md` 的 **Name** 推导默认 slug / title。
- **上架成功链接**：`POST /api/packs` 返回 **`viewUrl`**（`requestOrigin` / **`OPENCLAW_SOUL_SITE_URL`**），CLI 打印时优先用它，避免 `OPENCLAW_SOUL_API` 指向 `*.vercel.app` 时提示错域。
- **头像**：网页用 Canvas 在浏览器压缩；CLI 用 **`sharp`** 本机压缩；服务端仍校验 ≤512 KiB。
- **Vercel Blob**：`put` 使用 **`addRandomSuffix`**，同 slug 覆盖时旧 blob 不删（历史对象仍占存储）；私有库需 **`BLOB_ACCESS=private`**。

### 备份 / 还原

- 与 `apply`、配置改写衔接；备份介质为 **改名后的目录或副本**，具体命令名实现时定。

## 推荐技术栈（CLI）

- **Node.js 20+**、**TypeScript**、**commander**。
- Zip：**archiver** / **yauzl** 或 **extract-zip**（择一组合）。
- **`openclaw.json`**：**json5**；workspace 以 **`agents.defaults.workspace`** 为准（与官方文档一致）；写回时注明可能丢失注释。
- 分发：**npm** + `bin`，支持 `npx …`。

## Web / API（MVP）

- **Auth 必做**：注册/登录 + **API Token** 供 `publish`。
- **Next.js App Router** + **Prisma ORM 7**（`prisma.config.ts` 配数据源；**PostgreSQL** + `@prisma/adapter-pg`；`prisma migrate`；客户端生成到 `web/src/generated/prisma`）+ 本机 **`storage/`** 或 **`BLOB_READ_WRITE_TOKEN`**（Vercel Blob）存 zip/头像。

## 展示与上线（当前优先级）

以 **先上线、再秀 Soul 妙用、让人想拥有** 为主轴；可执行 checklist 见 [`docs/SHOWCASE-PLAN.md`](docs/SHOWCASE-PLAN.md)。

## 沟通偏好

中文交流，技术专有名词保留英文。

## Git

当存在功能点开发完成，而且即将新功能时，提示在进行之前是否创建 **git commit 之前**，
