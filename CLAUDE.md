# OpenClaw Soul — AI 协作上下文

## 项目是什么

为 **OpenClaw** 提供 **人设 / workspace 的社区分享与一键切换**：

1. **Registry + Web（MVP）** — 用户注册登录、画廊展示（可简陋）、为 CLI 签发 **API Token**；存储完整 workspace **zip** 与**头像**（头像可先传后在页面上再配置）。
2. **CLI**（`ocs` / 根目录 `npm run ocs`）— `apply`、`publish`（`--source current` 或目录路径）、`download`、`import`（`manifest.json` + 白名单 → `--target`）、`archive-directory`、`restore-openclaw-config`、`backup-openclaw-config`；`apply` 与写配置前 **rename / copy 备份**，**不用 `rm`**。

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
3. **读取并写回 `~/.openclaw/openclaw.json`**，将 workspace 指向上一步目录（注意 JSON5）。
4. 覆盖或切换前：**rename** 旧目录/旧配置到备份名，**不 `rm -rf`**。

### `publish`（分享）

- 用户**选择打包源**：
  - **当前默认目录**：读取 `openclaw.json` 里正在使用的 workspace 路径，整目录打 zip；或
  - **显式路径**：用户指定目录。
- **MVP：全量上传**，目录里有什么就打什么进 zip，**不做脱敏、不过滤文件**。

### 备份 / 还原

- 与 `apply`、配置改写衔接；备份介质为 **改名后的目录或副本**，具体命令名实现时定。

## 推荐技术栈（CLI）

- **Node.js 20+**、**TypeScript**、**commander**。
- Zip：**archiver** / **yauzl** 或 **extract-zip**（择一组合）。
- **`openclaw.json`**：**json5**（写回时注明可能丢失注释）。
- 分发：**npm** + `bin`，支持 `npx …`。

## Web / API（MVP）

- **Auth 必做**：注册/登录 + **API Token** 供 `publish`。
- **Next.js App Router** + **Prisma ORM 7**（`prisma.config.ts` 配数据源；`@prisma/adapter-better-sqlite3` + 本地 **SQLite** 零配置；客户端生成到 `web/src/generated/prisma`）+ 本机目录 **`storage/`** 存 zip/头像（可换 Blob/R2/S3）。

## 沟通偏好

中文交流，技术专有名词保留英文。

## Git

创建 **git commit 之前**须征得项目维护者确认（除非对方明确说可直接提交）。
