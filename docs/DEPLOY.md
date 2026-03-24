# 部署（生产）

一条线：**Postgres** + **可选远程 Blob** + **Next.js**（如 Vercel）。以下为命令级步骤。

## 1. 数据库（Neon / Supabase / 自建 Postgres）

1. 创建数据库，拿到连接串（建议带 **SSL** 的 URL，如 Neon 默认 `?sslmode=require`）。
2. 在部署平台设置环境变量 **`DATABASE_URL`**（仅对 Server 可见，勿打进浏览器 bundle）。

## 2. 构建前迁移

CI 或 Vercel **Build command** 里在 `web` 下执行迁移（生成 client 已由 `npm run build` 内 `prisma generate` 覆盖）：

```bash
cd web && npx prisma migrate deploy
```

本地首次对空库建表：

```bash
docker compose up -d
# compose 默认把 Postgres 映射到本机 55432，避免与已有 5432 冲突
cd web && cp .env.example .env   # 填好 DATABASE_URL（示例已指向 localhost:55432）
npx prisma migrate dev
npm run dev
```

## 3. 环境变量清单

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Postgres 连接串（必填） |
| `AUTH_SECRET` | 至少 16 字符，用于 session JWT |
| `BLOB_READ_WRITE_TOKEN` | 可选；若设置则 zip/头像走 [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) |
| `STORAGE_DRIVER` | 可选；设为 `vercel-blob` 与设 token 等价，显式启用 Blob |
| `STORAGE_PATH` | 可选；仅 **未** 用 Blob 时，本地/容器盘上的存储根目录（默认 `web/storage`） |

生产若不用 Blob，须保证运行环境有**持久可写盘**（多数 Serverless 无持久盘，请用 Blob / S3 等）。

## 4. Vercel 示例

1. 项目 Root Directory 指向 monorepo 根或仅 `web`（若仅 `web`，需把 `prisma`、`prisma.config.ts` 留在该目录内，当前结构已满足）。
2. **Install**：在根执行 `npm install`（workspaces）。
3. **Build**：`npm run build`（根脚本会先 build CLI 再 build web）；或在仅 web 场景下 `cd web && npx prisma generate && npx prisma migrate deploy && next build`。
4. 在 Vercel 项目 Settings → Environment Variables 填入上表变量；在 Storage 开通 Blob 并把 token 写入 `BLOB_READ_WRITE_TOKEN`。

## 5. 部署后自检

- 打开站点 `/` 与 `/privacy`。
- 注册 → Dashboard 设 handle → 创建 token → `ocs publish` 指向生产 `OPENCLAW_SOUL_API`。
- 画廊可见 pack，`apply` 可下载 zip。

## 从旧版 SQLite 迁移

本仓库已改为 **仅支持 PostgreSQL**。旧 `file:./prisma/dev.db` 数据请自行导出/重建账号，或单独写迁移脚本（未内置）。
