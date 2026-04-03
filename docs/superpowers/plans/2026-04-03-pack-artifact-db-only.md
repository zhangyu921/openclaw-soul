# Pack 真源仅 DB：移除 `PackArtifactSource` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 `PackArtifactSource` 与 `Pack.artifactSource`，使 publish / download 仅走「子表真源 + 缓存 zip」，并清理死代码与脚本。

**Architecture:** Prisma migration 删列与枚举；`POST /api/packs` 新建与替换统一为 ingest → `extractPackPreviewFromDb` → `buildAndStoreZipFromPackDb`；`GET .../download` 统一为读缓存失败则重建；删除迁移脚本；种子脚本写入最小子表并走同一管线。`storage.ts` 的 Blob/本地 driver **不动**。

**Tech Stack:** Next.js App Router、Prisma、PostgreSQL、现有 `pack-source-ingest` / `pack-source-zip` / `zip-pack-preview`。

**Spec:** [`docs/superpowers/specs/2026-04-03-pack-artifact-db-only-design.md`](../specs/2026-04-03-pack-artifact-db-only-design.md)

---

## 文件映射（将创建 / 修改）

| 路径 | 作用 |
|------|------|
| `web/prisma/schema.prisma` | 删枚举与字段；改注释 |
| `web/prisma/migrations/<new>/migration.sql` | `DROP COLUMN` + `DROP TYPE`（`pnpm exec prisma migrate dev` 生成） |
| `web/src/generated/prisma/*` | `prisma generate` 产出，勿手改 |
| `web/src/app/api/packs/route.ts` | 合并 publish 分支；新建 pack 顺序见 Task 2 |
| `web/src/app/api/packs/[handle]/[slug]/download/route.ts` | 去掉 `PackArtifactSource` 分支 |
| `web/src/lib/zip-pack-preview.ts` | 更新注释；视情况删除 `extractPackPreviewFromZip` |
| `web/src/lib/pack-source-ingest.ts` | 文件头注释 |
| `web/src/lib/pack-source-zip.ts` | 文件头注释 |
| `web/prisma/schema.prisma`（Pack 字段注释） | `soulPreviewMd` 注释不再引用已删函数名 |
| `web/scripts/migrate-pack-to-db-source.ts` | **删除** |
| `web/scripts/seed-mock-packs.ts` | 每包 ingest + 预览 + 缓存 zip（或等价） |

---

### Task 1: Schema 与 migration

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/*/migration.sql`（由 CLI 生成）

- [ ] **Step 1:** 在 `schema.prisma` 中删除整个 `enum PackArtifactSource` 块；删除 `Pack.artifactSource` 字段；将 `PackMarkdownFile` / `PackBinaryFile` 注释改为不依赖枚举；将 `soulPreviewMd` 行注释改为「publish 时从真源提取」类表述，不绑定 `extractPackPreviewFromZip` 函数名。

- [ ] **Step 2:** 在 `web/` 下运行 `pnpm exec prisma migrate dev --name pack_artifact_db_only`（或项目约定命令），生成并应用 migration；确认 SQL 含 `DROP COLUMN "artifactSource"` 与 `DROP TYPE "PackArtifactSource"`。

- [ ] **Step 3:** 运行 `pnpm exec prisma generate`（若 migrate 未自动触发）。

- [ ] **Step 4:** Commit

```bash
git add web/prisma/schema.prisma web/prisma/migrations
git commit -m "feat(web): drop PackArtifactSource enum and column"
```

---

### Task 2: `POST /api/packs` — 替换与新建

**Files:**
- Modify: `web/src/app/api/packs/route.ts`

**替换（`dup` 存在且 `replace`）：** 删除 `if (dup.artifactSource === PackArtifactSource.DB)` 与整个 `else`（原 BLOB 分支）。保留 **单一路径**：`ingestZipToPackSource` → `extractPackPreviewFromDb` → `buildAndStoreZipFromPackDb`，再 `pack.update`（title、summary、预览字段、visibility、avatar），与当前 DB 分支后半段一致。

**新建（无 `dup`）：** 不能再用「仅 zip 预览 + create」。推荐顺序（子表需 `packId`）：

1. `const id = randomUUID()`，`await ensurePackDirs()`。
2. `zipRelPath = await writeZipForPack(id, zipBuf)` — 满足 `Pack.zipRelPath` NOT NULL，且与现网「先落盘」一致。
3. `prisma.pack.create`，`soulPreviewMd` / `packFilePaths` 可先给 `null` / `[]`，其余 slug、title、summary、authorId、visibility、avatar 等按现逻辑。
4. `ingestZipToPackSource(prisma, id, zipBuf)`。
5. `preview = await extractPackPreviewFromDb(prisma, id)`。
6. `await buildAndStoreZipFromPackDb(prisma, id)` — 更新 `zipRelPath` 为规范缓存。
7. `prisma.pack.update` 写入 `soulPreviewMd`、`soulPreviewTruncated`、`packFilePaths`（及若 create 时未写的字段）。

失败回滚：对齐现有模式（create 失败删 zip/avatar 等）；若 ingest 在 create 之后失败，需删除子表行（ingest 可能已部分写入 — 以 `ingestZipToPackSource` 行为为准）并删 pack 行与存储文件 — **与现 DB 替换失败策略一致**，可抽共用 helper 仅在必要时。

- [ ] **Step 1:** 实现上述替换与新建，移除 `PackArtifactSource`、`extractPackPreviewFromZip` 的 import 与调用。

- [ ] **Step 2:** `pnpm --filter @openclaw-soul/web exec tsc --noEmit`（或根目录等价类型检查）

- [ ] **Step 3:** Commit

```bash
git add web/src/app/api/packs/route.ts
git commit -m "feat(web): unify publish to DB-backed ingest path"
```

---

### Task 3: `GET .../download`

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/download/route.ts`

- [ ] **Step 1:** 删除 `PackArtifactSource` import；将 `try` 内逻辑改为 **无条件** 执行当前「DB 分支」：`readStoredFile` → catch 则 `buildAndStoreZipFromPackDb`；删除 `else` 中仅 `readStoredFile` 的重复路径。

- [ ] **Step 2:** 类型检查 + Commit

```bash
git add web/src/app/api/packs/[handle]/[slug]/download/route.ts
git commit -m "refactor(web): simplify pack download to single cached-or-rebuild path"
```

---

### Task 4: `zip-pack-preview` 与 lib 注释

**Files:**
- Modify: `web/src/lib/zip-pack-preview.ts`
- Modify: `web/src/lib/pack-source-ingest.ts`
- Modify: `web/src/lib/pack-source-zip.ts`

- [ ] **Step 1:** 若 `extractPackPreviewFromZip` **无任何引用**（`rg extractPackPreviewFromZip web`），删除该函数及仅为其服务的私有辅助逻辑，保留 `extractPackPreviewFromDb` 与 `parsePackFilePaths` 等。

- [ ] **Step 2:** 更新 `extractPackPreviewFromDb` 上方注释，去掉 `Pack.artifactSource`。

- [ ] **Step 3:** 更新 `pack-source-ingest.ts` / `pack-source-zip.ts` 文件头，去掉「artifactSource === DB」措辞。

- [ ] **Step 4:** Commit

```bash
git add web/src/lib/zip-pack-preview.ts web/src/lib/pack-source-ingest.ts web/src/lib/pack-source-zip.ts
git commit -m "chore(web): drop zip-only preview helper and fix pack source comments"
```

---

### Task 5: 删除迁移脚本

**Files:**
- Delete: `web/scripts/migrate-pack-to-db-source.ts`

- [ ] **Step 1:** 删除文件；`rg migrate-pack-to-db-source` 确认无 README/脚本引用。

- [ ] **Step 2:** Commit

```bash
git add -A web/scripts/migrate-pack-to-db-source.ts
git commit -m "chore(web): remove obsolete migrate-pack-to-db-source script"
```

（若 git 对删除使用 `git rm`）

---

### Task 6: `seed-mock-packs.ts`

**Files:**
- Modify: `web/scripts/seed-mock-packs.ts`

- [ ] **Step 1:** 对每个新插入的 pack：在 `create` 之后调用 `ingestZipToPackSource`（需内存中最小合法 zip `Buffer`，至少含 `SOUL.md`），再 `extractPackPreviewFromDb` + `buildAndStoreZipFromPackDb`，再 `update` pack 的 `soulPreviewMd` / `packFilePaths` 等。或：构造 zip 后复用与 `POST` 相同的步骤。确保 `zipRelPath` 最终由 `buildAndStoreZipFromPackDb` 写回。

- [ ] **Step 2:** 本地执行一次 seed（`DATABASE_URL` 已配置），对某一 slug 请求 download 应 200。

- [ ] **Step 3:** Commit

```bash
git add web/scripts/seed-mock-packs.ts
git commit -m "fix(web): align seed-mock-packs with DB-only pack source"
```

---

### Task 7: 全仓 grep 与可选文档一句

- [ ] **Step 1:** `rg PackArtifactSource`、`rg artifactSource`（除 `docs/superpowers/plans/2026-04-02-p1-b1-db-source-zip.md` 历史计划外）应为空或仅剩本 spec/plan。

- [ ] **Step 2:** （可选）在 `docs/superpowers/plans/2026-04-02-p1-b1-db-source-zip.md` 顶部加一行「双路径已由 2026-04-03 spec 废弃」。

- [ ] **Step 3:** 根目录运行项目约定 lint/test（如 `pnpm lint`、`pnpm test` 若存在）。

- [ ] **Step 4:** Commit（若有文档改动）

---

## 计划审阅

实施前将本 plan 与 spec 一并走 `plan-document-reviewer` 子流程（若仓库未配置，由人工审阅 checklist 代替）。

---

## 执行交接

**Plan 已保存至 `docs/superpowers/plans/2026-04-03-pack-artifact-db-only.md`。可选执行方式：**

1. **Subagent-Driven（推荐）** — 每任务派新子代理，任务间 review，迭代快。  
2. **Inline Execution** — 本会话用 executing-plans 按任务执行并设检查点。

**你希望用哪一种？**（若你自行实现，直接按 Task 1→7 勾选即可。）
