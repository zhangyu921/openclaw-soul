# P1-B-1 库表真源与按需 zip Implementation Plan

> **后续变更：** `PackArtifactSource`（`BLOB` / `DB`）双路径已在 [2026-04-03 pack-artifact-db-only spec](../specs/2026-04-03-pack-artifact-db-only-design.md) 中移除；现网仅保留子表真源 + 缓存 zip。下文 checklist 中关于双模式分支的表述保留作历史记录。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 [`docs/superpowers/specs/2026-04-02-p1-b1-db-source-zip-design.md`](../specs/2026-04-02-p1-b1-db-source-zip-design.md)：Blob 模式与库表模式共存；库表模式下全部 `.md` 落库、非 md 走 Blob 映射；下载路由优先返回缓存 zip，否则组包并写回 Blob；`POST` 在库表模式下与 zip 同步真源；维护者迁移脚本；CLI `apply` 契约不变。

**Architecture:** Prisma 扩展 `Pack`（交付模式枚举）+ `PackMarkdownFile` + `PackBinaryFile`（或等价命名）。共享模块 **`ingestZipBuffer`**（zip → md 行 + 二进制上传 + 删旧路径）与 **`buildZipFromDb`**（库表 → `Buffer` + 2 MiB 校验）。`POST /api/packs` 在 **已处于库表模式** 的 replace 成功后调用 ingest；**进入库表模式** 以迁移脚本为主。`download` 路由按模式分支并处理缓存。

**Tech Stack:** Next.js App Router, Prisma/Postgres, 现有 `@/lib/storage`（Vercel Blob / 本地），`yauzl`/`archiver` 或项目已有 zip 依赖（与 `zip-pack-preview` 对齐），`packages/cli` 仅回归测试。

---

## File map（预期改动面）

| 区域 | 文件 / 目录 |
|------|----------------|
| Schema | `web/prisma/schema.prisma`，`web/prisma/migrations/<ts>_p1_b1_pack_source/` |
| 存储扩展 | `web/src/lib/storage.ts`（二进制对象写入，与 `writeZipForPack` 同 driver 语义） |
| 核心逻辑（新建） | `web/src/lib/pack-source-ingest.ts`（解析 zip、路径规范化、写入 DB + Blob） |
| 核心逻辑（新建） | `web/src/lib/pack-source-zip.ts`（从 DB 组装 zip 流或 Buffer） |
| API | `web/src/app/api/packs/route.ts`，`web/src/app/api/packs/[handle]/[slug]/download/route.ts` |
| 预览缓存 | `web/src/lib/zip-pack-preview.ts` 或调用方：库表模式下 `soulPreviewMd` / `packFilePaths` 从 md 表派生（实现计划定一处） |
| 迁移 | `web/scripts/migrate-pack-to-db-source.ts`（或 `packages/` 下可 `pnpm` 运行的脚本），读 `DATABASE_URL` |
| 测试 | `web/src/lib/pack-source-ingest.test.ts`（或 `vitest`/`jest` 与仓库一致），`packages/cli/test/*` 回归 |

---

### Task 1: Prisma enum + 表结构

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/.../migration.sql`

- [ ] **Step 1:** 在 `Pack` 上增加 **`PackArtifactSource`**（建议命名：`BLOB` | `DB`）或等价布尔+迁移，默认 **`BLOB`**，与现有行 **完全兼容**。
- [ ] **Step 2:** 新增 **`PackMarkdownFile`**：`packId` FK、`path`（zip 内相对路径，唯一约束 `@@unique([packId, path])`）、`content` `@db.Text`、`updatedAt`。
- [ ] **Step 3:** 新增 **`PackBinaryFile`**：`packId` FK、`path`（唯一约束同上）、`storageRef`（Blob URL 或相对 `storage` 路径，与 `zipRelPath` 风格一致）、可选 `byteSize`、`sha256`。
- [ ] **Step 4:** `onDelete: Cascade` 从 `Pack` 到子表。`pnpm exec prisma migrate dev`（本地）+ `pnpm exec prisma generate`（`web/`）。提交 migration。

---

### Task 2: 路径与安全约定（纯函数）

**Files:**
- Create: `web/src/lib/pack-paths.ts`（或并入 ingest）

- [ ] **Step 1:** 实现 **`normalizeZipEntryPath(name: string): string | null`**：统一 `/`、拒绝 `..`、拒绝绝对路径、空路径返回 null。
- [ ] **Step 2:** 实现 **`isMarkdownPath(path: string): boolean`**（`.md` 大小写策略：建议 **大小写不敏感** 与 spec §2.1 一致，在注释中写死）。
- [ ] **Step 3:** 单测：`normalizeZipEntryPath` 对 `../x`、`foo//bar`、`.md` 边界。

---

### Task 3: `storage` 二进制写入

**Files:**
- Modify: `web/src/lib/storage.ts`

- [ ] **Step 1:** 新增 **`writeBinaryForPack(packId: string, entryPath: string, buf: Buffer): Promise<string>`**：对象键含 `packId` + 哈希或路径 slug，**Vercel Blob** 与本地 `storage/` 双路径，与 `writeZipForPack` 同 `addRandomSuffix`/token 策略（实现计划可照抄 `writeZipForPack` 模式）。
- [ ] **Step 2:** 新增 **`removeStoredFileIfExists`** 或复用现有删除（若有），供 replace 时删孤儿 Blob **best-effort**。

---

### Task 4: `ingestZipBuffer`（事务 + 存储）

**Files:**
- Create: `web/src/lib/pack-source-ingest.ts`
- Modify: `web/package.json`（若缺 zip 解压库且与 `zip-pack-preview` 不一致则统一）

- [ ] **Step 1:** 实现 **`ingestZipToPackSource(tx, packId, zipBuf: Buffer)`**（签名可调整）：解压遍历 → 对每个合法路径：md → `upsert` `PackMarkdownFile`；非 md → `writeBinaryForPack` + `upsert` `PackBinaryFile`。
- [ ] **Step 2:** **replace 语义**：先查询该 pack 现有 md/binary 路径集合，新 zip 中**不存在**的路径 → **delete** 行 + best-effort 删 Blob。
- [ ] **Step 3:** 全包 **≤ `MAX_PACK_ZIP_BYTES`**（与 `route.ts` 常量一致）；超标抛错，**不写**半套子表。
- [ ] **Step 4:** 单元测试：小 zip fixture（仅 md / md+png）→ 内存 DB 或 mock prisma（按仓库惯例）。

---

### Task 5: `buildZipFromDb` + 缓存写回

**Files:**
- Create: `web/src/lib/pack-source-zip.ts`

- [ ] **Step 1:** 从 Prisma 读某 `packId` 的全部 `PackMarkdownFile` + `PackBinaryFile`，按路径排序后 **生成 zip `Buffer`**（`archiver` 或项目已有 API），合并前校验 **总大小 ≤ 2 MiB**；拉取任一二进制 **`readStoredFile` 失败** 时抛错并映射为可测失败（**500** + 明确错误体，与 spec §6 一致）。
- [ ] **Step 2:** 成功后调用 **`writeZipForPack(packId, buf)`** 更新 **`Pack.zipRelPath`**（缓存真源），并 **commit**。
- [ ] **Step 3:** 单测：round-trip（ingest → build → unzip）路径集合与内容一致（§6 等价标准）。

---

### Task 6: `POST /api/packs` 衔接

**Files:**
- Modify: `web/src/app/api/packs/route.ts`

- [ ] **Step 1:** **create**：行为与现网一致，**`artifactSource = BLOB`**，不写子表（除非实现计划另选「首包即 ingest」——**默认否**，与 spec「迁移脚本为主」一致）。
- [ ] **Step 2:** **replace 且成功写入 zip 后**：若 `pack.artifactSource === 'DB'`，对 **本次上传的 zipBuf** 调用 **`ingestZipToPackSource`**，再调用 **`buildZipFromDb`** 写回缓存；任一步失败 → **400/500** 并 **不** 留下「zip 已更新但子表未更新」（回滚或事务）。**注意**：Prisma `$transaction` 仅覆盖 DB；Blob 写入无法与 DB 同事务——实现时约定顺序（如先二进制上传再提交行，或失败时 best-effort 清理），勿把异步 Blob 放进 transaction 回调。
- [ ] **Step 3:** 更新 **`soulPreviewMd` / `packFilePaths`**：库表模式下从 md 表 + 路径列表派生（与 `extractPackPreviewFromZip` 输出结构对齐，避免详情页坏掉）。

---

### Task 7: `GET .../download` 分支

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/download/route.ts`

- [ ] **Step 1:** `artifactSource === 'BLOB'`：**现有逻辑** `readStoredFile(pack.zipRelPath)`。
- [ ] **Step 2:** `artifactSource === 'DB'`：**若 `zipRelPath` 已指向有效缓存**（刚 publish 或迁移后已写回），直接 **`readStoredFile`** 返回（与 spec「优先缓存」一致）。
- [ ] **Step 3:** 若缓存缺失或实现选择懒生成：调用 **`buildZipFromDb`**（写回 + 返回）或流式响应；错误 **500** + JSON 信息（实现计划写死）。
- [ ] **Step 4:** 鉴权与 `visibility` **与现网一致**（不改 P1-A 语义）。

---

### Task 8: 维护者迁移脚本

**Files:**
- Create: `web/scripts/migrate-pack-to-db-source.ts`（或仓库惯用位置）

- [ ] **Step 1:** 入参：`--packIds` 或 `--all`（**谨慎**），`DATABASE_URL` 必填。
- [ ] **Step 2:** 对每个 pack：`readStoredFile(zipRelPath)` → `ingestZipToPackSource` → **设 `artifactSource = DB`** → **`buildZipFromDb`** 写缓存。
- [ ] **Step 3:** **幂等**：第二次运行 **全量覆盖**（或 `deleteMany` 子表再 ingest），在脚本头注释说明。
- [ ] **Step 4:** `docs/DEVELOPMENT.md` 增加 **运行示例一行**（非长篇文档）。

---

### Task 9: 回归与验收

**Files:**
- `packages/cli/test/cli-integration.test.ts`（若存在 apply 路径）
- 根 `package.json` / `pnpm test`

- [ ] **Step 1:** **Blob 模式**：现有集成测试通过；手动 `apply`  listed pack。
- [ ] **Step 2:** 迁移 **一个** 测试 pack 后 **库表模式**：`apply` 解压内容与迁移前 zip **路径+字节**一致（§6）。
- [ ] **Step 3:** `pnpm test`（根或 workspace 脚本）全绿后提交。

---

## 依赖与风险

- **Serverless 内存**：2 MiB 上限使 zip 全量缓冲可接受；若将来放大，需流式组 zip（**非本 plan 必做**）。
- **Vercel Blob `addRandomSuffix`**：子表二进制与缓存 zip 均会留下历史对象；与 [`AGENTS.md`](../../../AGENTS.md) 成本说明一致。

---

## 参考

- Spec：[`2026-04-02-p1-b1-db-source-zip-design.md`](../specs/2026-04-02-p1-b1-db-source-zip-design.md)
- 现有下载：[`web/src/app/api/packs/[handle]/[slug]/download/route.ts`](../../../web/src/app/api/packs/[handle]/[slug]/download/route.ts)
