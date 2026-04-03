# Pack 真源仅 DB：移除 `PackArtifactSource`（设计稿）

**日期**：2026-04-03  
**状态**：已定稿（待实现）  
**前置**：[P1-B-1 库表真源与按需 zip](2026-04-02-p1-b1-db-source-zip-design.md) 已在代码中引入 `PackArtifactSource`（`BLOB` | `DB`）双路径。本 spec 为 **收尾**：在 **各环境均无 `BLOB` 行** 的前提下，**删除枚举与字段**，**统一实现为「子表真源 + 缓存 zip」**，并清理死代码。

---

## 1. 背景与目标

**背景**：历史上 `BLOB` 表示「仅依赖 `zipRelPath` 指向的 zip，无 `PackMarkdownFile` / `PackBinaryFile`」；`DB` 表示 **md/二进制行** 为真源，按需组 zip 并缓存。产品已决定 **只保留后者**。

**注意**：`storage.ts` 中的 **Vercel Blob / 本地磁盘** 作为 **对象存储 driver**（`zipRelPath`、`PackBinaryFile.storageRef` 等）**保留**，与本 spec 删除的 **Prisma 枚举名 `BLOB`** 不是同一概念。

**目标**

- 从 schema 中 **移除** `PackArtifactSource` 与 `Pack.artifactSource`。
- **新建**与 **替换** publish 均走 **ingest → 从 DB 取预览 → 写回缓存 zip**（与当前 `artifactSource === DB` 分支一致）。
- **下载** 仅保留 **读缓存 zip，失败则从 DB 组装并写回**（与当前 DB 分支一致）。
- 删除维护者迁移脚本 `migrate-pack-to-db-source.ts`（或等价物），避免误用。
- 更新 `seed-mock-packs.ts`，使 mock 数据含 **最小子表内容** 且与缓存 zip 策略一致，避免列表可展示但下载失败。

**非目标**

- 改变 **2 MiB** zip 上限、CLI 契约、`visibility` 行为。
- 移除 **BLOB_READ_WRITE_TOKEN** 或统一存储 driver（除非另起项目）。

**前置假设（已确认）**

- **生产**与**本地**数据库中 **不存在** `artifactSource = BLOB` 的 `Pack` 行；无需数据回填即可 `DROP COLUMN` / `DROP TYPE`。

---

## 2. 数据模型

- **删除** `enum PackArtifactSource`（`BLOB`、`DB`）。
- **删除** `Pack.artifactSource`（含 `@default(BLOB)`）。
- 更新 `PackMarkdownFile` / `PackBinaryFile` 注释：真源语义 **不再** 以「当 `artifactSource` 为 DB 时」为条件句。

**迁移**：Prisma migration 生成 `ALTER TABLE "Pack" DROP COLUMN "artifactSource"` 及 `DROP TYPE "PackArtifactSource"`（具体 SQL 以生成结果为准）。

---

## 3. HTTP 与库逻辑

### 3.1 `POST /api/packs`（multipart publish）

- **替换**（同 slug 已存在）：删除 `dup.artifactSource` 分支；**始终** `ingestZipToPackSource` → `extractPackPreviewFromDb` → `buildAndStoreZipFromPackDb`，再更新 `Pack` 元数据（title、summary、`soulPreviewMd`、`packFilePaths`、visibility、avatar 等），行为与 **当前 DB 分支** 对齐。
- **新建**：创建 `Pack` 记录后，对 **同一 `packId`** 执行与上相同的 ingest → 预览 → 缓存 zip；**不再**使用「仅 `writeZipForPack` + `extractPackPreviewFromZip` + create」路径。
- 错误处理与清理（失败时删除已写文件等）保持与现网 **DB 路径** 一致，不因本变更放宽事务边界（Blob 与 DB 仍非单事务）。

### 3.2 `GET /api/packs/<handle>/<slug>/download`

- 移除对 `PackArtifactSource` 的依赖与 `if/else`。
- **统一**：先 `readStoredFile(pack.zipRelPath)`；失败则 `buildAndStoreZipFromPackDb`；仍失败则返回现有 4xx/5xx 语义。

---

## 4. 脚本与种子

- **`web/scripts/migrate-pack-to-db-source.ts`**：**删除**（历史迁移已完成且无再用例）。
- **`web/scripts/seed-mock-packs.ts`**：插入的每个 mock `Pack` 须 **至少** 有对应 **`PackMarkdownFile`**（如 `SOUL.md`），并 **生成/写回** 与线上一致的缓存 zip（复用 `ingestZipToPackSource` + `buildAndStoreZipFromPackDb`，或从内存中构造最小 zip 字节再走 ingest）。目标：本地 **列表 + 下载** 可测通。

---

## 5. 代码与文档清理

- 全文搜索 `PackArtifactSource`、`artifactSource`，确保无残留引用。
- `extractPackPreviewFromZip`：若 **仅** 被已删路径使用，可删除或保留为 **zip 工具**（以实际引用为准）；路由层 **不再** 依赖「仅从 zip 提取预览」作为 publish 主路径。
- 可选：在 [P1-B-1 实现计划](../plans/2026-04-02-p1-b1-db-source-zip.md) 或 ROADMAP 加 **一句** 说明双路径已由本变更废弃（非必须）。

---

## 6. 验收

- Prisma migrate 在空库与已有 **仅 DB 模式** 库上均可应用。
- 新 publish、replace、download 行为与 **变更前 DB 模式** 一致。
- `seed-mock-packs` 跑完后，任选一条 mock 可成功下载 zip。
- 无 TypeScript / 测试回归（运行项目既有校验命令）。

---

## 7. 决策记录

| 决策 | 选择 | 说明 |
|------|------|------|
| 迁移策略 | 一次性删列 | 各环境无 `BLOB` 行，无需两阶段发布 |
| 存储 driver | 保留 | 与「artifact 模式枚举」解耦 |
