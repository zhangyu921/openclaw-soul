# 部署（生产）

一条线：**Postgres** + **可选远程 Blob** + **Next.js**（如 Vercel）。以下为命令级步骤。

## 1. 数据库（Neon / Supabase / 自建 Postgres）

1. 创建数据库，拿到连接串（建议带 **SSL** 的 URL，如 Neon 默认 `?sslmode=require`）。
2. 在部署平台设置环境变量 **`DATABASE_URL`**（仅对 Server 可见，勿打进浏览器 bundle）。

## 2. 构建前迁移

**Vercel（Root Directory = `web`）**：[`web/vercel.json`](web/vercel.json) 的 `buildCommand` 已是 `npx prisma migrate deploy && pnpm run build`，**每次自动构建都会先跑迁移**，不必在面板里再配一条或 SSH 手动执行；只要环境里已有 **`DATABASE_URL`** 即可。

其他 CI 或本地预检，在 `web` 下执行（生成 client 已由 `pnpm run build` 内 `prisma generate` 覆盖）：

```bash
cd web && pnpm exec prisma migrate deploy
```

本地首次对空库建表：

```bash
docker compose up -d
# compose 默认把 Postgres 映射到本机 55432，避免与已有 5432 冲突
cd web && cp .env.example .env   # 填好 DATABASE_URL（示例已指向 localhost:55432）
pnpm exec prisma migrate dev
cd .. && pnpm run dev
```

## 3. 环境变量清单

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Postgres 连接串（必填） |
| `AUTH_SECRET` | 至少 16 字符，用于 session JWT |
| `GITHUB_CLIENT_ID` | 可选；Web 端 GitHub OAuth 登录（与 `GITHUB_CLIENT_SECRET` 配套） |
| `GITHUB_CLIENT_SECRET` | 可选；Web 端 GitHub OAuth 登录密钥 |
| `BLOB_READ_WRITE_TOKEN` | 可选；若设置则 zip/头像走 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| `BLOB_ACCESS` | 可选；Blob 控制台为 **私有** 时设为 `private`（与默认 `public` 冲突会 500）；与 `web/.env.example` 一致 |
| `STORAGE_DRIVER` | 可选；设为 `vercel-blob` 与设 token 等价，显式启用 Blob |
| `STORAGE_PATH` | 可选；仅 **未** 用 Blob 时，本地/容器盘上的存储根目录（默认 `web/storage`） |
| `OPENCLAW_SOUL_SITE_URL` | 可选；`https://主域`（无末尾 `/`）。**固定对外主域**：`npx @openclaw-soul/cli login` 里打开的 device 链接、以及依赖 `requestOrigin` 的 JSON 里的 URL 都会用这个；多域名指向同一部署、或以后要换主域时，建议始终设成「用户应记住的那一个」。 |

生产若不用 Blob，须保证运行环境有**持久可写盘**（多数 Serverless 无持久盘，请用 Blob / S3 等）。

**上传体积**：pack zip 上限 **2 MiB**、头像 **512 KiB** 由 API 最终校验；头像在**用户浏览器**与 **CLI `npx @openclaw-soul/cli publish` 本机**会先压缩再上传，部署侧**不必**装 `sharp` 等图像库。

## 更换域名（二级域 → 主域等）

**同一套 Vercel 项目 + 同一 `DATABASE_URL`** 时，只是换访问域名，**数据库与 token 不必重做**（除非你也换了库）。

1. **Vercel**：Project → Domains 添加新域名，DNS 按提示配好；需要的话把旧域名设为 redirect 到新域名（避免书签、文档里的旧链接失效）。
2. **环境变量**：把 **`OPENCLAW_SOUL_SITE_URL`** 改成新主域（`https://新域`），与 **Vercel Primary Domain** 心智一致；重部署。
3. **所有 CLI 用户**（含你自己）：在 `~/.config/openclaw-soul/env`（或 `OPENCLAW_SOUL_CONFIG_DIR`）里把 **`OPENCLAW_SOUL_API`** 改成新域名的根 URL；一般 **不必** 换 token。若曾混用两个域、两套库，再各自 `npx @openclaw-soul/cli login` 一次最干净。
4. **站内链接**：画廊与 pack 路径是相对站点的（`/packs/...`），换域后页面照常；**别人保存的完整旧 URL** 要靠你在 Vercel 上保留旧域并重定向到新域来续命。
5. **Blob**：若已用 Vercel Blob，zip/头像 URL 在 Blob 域名上，**不**随你自定义域变化；无需为换域迁文件。每次上传使用带随机后缀的对象键，**覆盖同一 slug 时旧 zip/头像对象仍留在 Blob**（仅 DB 指向新 URL）；需控成本可在控制台或后续脚本做生命周期清理。

## 4. Vercel（推荐：只部署 Web）

仓库里已有 `web/vercel.json`：在 **Root Directory** 设为 `web` 时，会从 monorepo 根执行 `pnpm install --frozen-lockfile`（根目录须提交 `pnpm-lock.yaml`），并在 build 时先 `prisma migrate deploy` 再 `pnpm run build`。Vercel 会根据 `packageManager` 字段使用对应 **pnpm** 版本。

1. [Vercel](https://vercel.com) → New Project → 导入本 Git 仓库。
2. **Root Directory**：填 `web`。
3. **Settings → Environment Variables**（Production / Preview 按需）：至少 `DATABASE_URL`、`AUTH_SECRET`；启用 GitHub 登录需加 `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`；上传 pack 需再加 `BLOB_READ_WRITE_TOKEN`（Vercel 项目 → Storage → Blob → 创建并复制 token）。
4. **首次部署前**必须在 Vercel 里配好 `DATABASE_URL`，否则 build 阶段迁移会失败。
5. （可选）在 **Settings → General** 打开 **Include files outside of the Root Directory in the Build Step**，若将来有从 `web` 引用仓库根目录文件的构建脚本，可避免缺文件。

若你希望 **从仓库根目录** 一个命令构建（含 CLI），也可把 Root Directory 留空，自行将 Install 设为 `pnpm install --frozen-lockfile`、Build 设为 `pnpm run db:deploy && pnpm --filter @openclaw-soul/web build`，并把 **Output Directory** 配成 Next 在子目录的产出（需对照 Vercel 对 subdirectory Next 的说明）；上述 `web` 根目录方式更简单。

## 5. 部署后自检

- 打开站点 `/` 与 `/privacy`。
- 注册 → Dashboard 设 handle → 创建 token → `npx @openclaw-soul/cli publish` 指向生产 `OPENCLAW_SOUL_API`。
- 画廊可见 pack，`npx @openclaw-soul/cli apply <handle>/<slug>` 可下载 zip。

## 从旧版 SQLite 迁移

本仓库已改为 **仅支持 PostgreSQL**。旧 `file:./prisma/dev.db` 数据请自行导出/重建账号，或单独写迁移脚本（未内置）。
