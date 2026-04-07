# P1-D Web 从零创建 pack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 dashboard 用 Session 创建空 slug pack，详情页「包内文件」支持新建 Markdown；空包禁止上架与下载；源文件同步后若已无内容且曾为 LISTED 则自动 UNLISTED。

**Architecture:** 新增 `packIsSourceEmpty`/`sync` 内聚的 **自动下架** 逻辑；**Session** `POST /api/packs/create` 写入空 zip + Prisma 行并走与 CLI 一致的 `ingest`/`buildAndStoreZipFromPackDb`；**POST** `.../source-file` 仅创建新 md；**publish**/**download** 在路由层拒绝空包。Dashboard 用 client Dialog + `fetch`；详情页作者始终渲染 `PackSourceFiles` 空态。

**Tech Stack:** Next.js App Router、`pnpm --filter @openclaw-soul/web`、Prisma、Vitest、`yazl`（空 zip）、既有 `normalizeZipEntryPath` / `isMarkdownPath`。

**Spec:** [`docs/superpowers/specs/2026-04-07-p1-d-web-create-pack-design.md`](../specs/2026-04-07-p1-d-web-create-pack-design.md)

---

## File map（创建 / 修改）

| 路径 | 职责 |
| --- | --- |
| `web/src/lib/pack-source-empty.ts` **新建** | 判断 pack 是否无 md/bin 行（供 API/UI 决策） |
| `web/src/lib/pack-source-zip.ts` **修改** | 导出 `buildEmptyZipBuffer()`（`yazl` 无条目，与 ingest 测试同源） |
| `web/src/lib/pack-source-sync.ts` **修改** | 同步后在「无源文件且 LISTED」时写入 `UNLISTED` + `packFilePaths` |
| `web/src/lib/pack-create-web.ts` **新建** | `createEmptyPackForUserId(prisma, userId, slug)`：handle 校验、slug、空 zip、`Pack` 创建、`ingest`、`sync`（或等价顺序与 `POST /api/packs` 对齐） |
| `web/src/app/api/packs/create/route.ts` **新建** | `POST` JSON `{ slug }`，Session，调用 `createEmptyPackForUserId`，返回 `{ ok, handle, slug, viewPath }` |
| `web/src/app/api/packs/[handle]/[slug]/source-file/route.ts` **修改** | 新增 `POST`：创建 md；保留 `PATCH` 仅更新 |
| `web/src/app/api/packs/[handle]/[slug]/publish/route.ts` **修改** | 转 LISTED 前若 `packIsSourceEmpty` → 400 |
| `web/src/app/api/packs/[handle]/[slug]/download/route.ts` **修改** | 若空包 → 400 + JSON `error` |
| `web/src/app/packs/[handle]/[slug]/page.tsx` **修改** | 作者始终显示「包内文件」；空包时禁用上架 / Download 按钮并附文案 |
| `web/src/app/packs/[handle]/[slug]/pack-source-files.tsx` **修改** | 空列表不 `return null`；新建 md 表单 + `POST` |
| `web/src/app/packs/[handle]/[slug]/pack-publish.tsx` **修改** | 接收 `disabled` + `disabledReason`（或同等 props） |
| `web/src/app/dashboard/page.tsx` **修改** | 「从零构建你的 SOUL」行在 CLI 行之上 |
| `web/src/app/dashboard/create-pack-dialog.tsx` **新建** | Client：Dialog、slug 输入、`fetch('/api/packs/create')`、成功则 `router.push` |

**测试文件**

| 路径 | 覆盖 |
| --- | --- |
| `web/src/lib/pack-source-empty.test.ts` **新建** | `packIsSourceEmpty` 逻辑（可用 mock 或内存 DB，若项目无 Prisma mock 则只测纯函数包装） |
| `web/src/lib/pack-source-sync.test.ts` **新建** | 若难以 mock Prisma，改为在 `pack-source-sync` 测 **导出**的纯函数 `visibilityAfterSync(empty, prevVisibility)` 并由 sync 调用 — **YAGNI**：优先直接测 `syncPackDerivedAfterSourceChange` 行为需 integration DB；**折中**：单元测 `shouldUnlistWhenEmpty(listed, pathCount)` 小函数与 sync 内联一致 |
| `web/src/lib/pack-source-zip.test.ts` **新建或扩** | `buildEmptyZipBuffer` 非空 Buffer、`readZipFilesAsMap` 得到 size 0 |

---

### Task 1: `buildEmptyZipBuffer` + ingest 兼容

**Files:**

- Create: `web/src/lib/pack-source-zip.ts`（新增导出函数，与现有 `zipFileToBuffer` 复用）
- Modify: `web/src/lib/pack-source-ingest.test.ts`（可选：断言空 zip `readZipFilesAsMap` 为空 map）

- [ ] **Step 1: 写失败测试（Vitest）**

在 `web/src/lib/pack-source-zip.test.ts`（新建）：

```ts
import { describe, expect, it } from "vitest";
import { readZipFilesAsMap } from "@/lib/pack-source-ingest";
import { buildEmptyZipBuffer } from "@/lib/pack-source-zip";

describe("buildEmptyZipBuffer", () => {
  it("yields zip readable as zero entries", async () => {
    const buf = await buildEmptyZipBuffer();
    const m = await readZipFilesAsMap(buf);
    expect(m.size).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/yuzhang/proj/openclaw-soul && pnpm exec vitest run web/src/lib/pack-source-zip.test.ts
```

Expected: `buildEmptyZipBuffer is not a function` 或 `not exported`。

- [ ] **Step 3: 实现 `buildEmptyZipBuffer`**

在 `pack-source-zip.ts` 中与 `zipFileToBuffer` 并列：

```ts
/** Minimal valid zip with no file entries (for empty pack bootstrap). */
export function buildEmptyZipBuffer(): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  return zipFileToBuffer(zip);
}
```

确保文件顶部已有 `import yazl from "yazl"`。

- [ ] **Step 4: 运行测试通过**

```bash
pnpm exec vitest run web/src/lib/pack-source-zip.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/pack-source-zip.ts web/src/lib/pack-source-zip.test.ts
git commit -m "feat(web): add buildEmptyZipBuffer for empty pack bootstrap"
```

---

### Task 2: `packIsSourceEmpty` 辅助函数

**Files:**

- Create: `web/src/lib/pack-source-empty.ts`
- Create: `web/src/lib/pack-source-empty.test.ts`

- [ ] **Step 1: 测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { packIsSourceEmpty } from "@/lib/pack-source-empty";

describe("packIsSourceEmpty", () => {
  it("returns true when both counts are 0", async () => {
    const db = {
      packMarkdownFile: { count: vi.fn().mockResolvedValue(0) },
      packBinaryFile: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(packIsSourceEmpty(db as never, "pid")).resolves.toBe(true);
  });
  it("returns false when md exists", async () => {
    const db = {
      packMarkdownFile: { count: vi.fn().mockResolvedValue(1) },
      packBinaryFile: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(packIsSourceEmpty(db as never, "pid")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: 实现**

```ts
import type { PrismaClient } from "@/generated/prisma/client";

export async function packIsSourceEmpty(
  db: PrismaClient,
  packId: string
): Promise<boolean> {
  const [md, bin] = await Promise.all([
    db.packMarkdownFile.count({ where: { packId } }),
    db.packBinaryFile.count({ where: { packId } }),
  ]);
  return md === 0 && bin === 0;
}
```

- [ ] **Step 3: `pnpm exec vitest run web/src/lib/pack-source-empty.test.ts` → PASS**

- [ ] **Step 4: Commit** `feat(web): add packIsSourceEmpty helper`

---

### Task 3: `syncPackDerivedAfterSourceChange` 自动 UNLISTED

**Files:**

- Modify: `web/src/lib/pack-source-sync.ts`

- [ ] **Step 1: 修改 sync**：在 `buildAndStoreZipFromPackDb` 之后、`pack.update` 时合并逻辑：

  - `const empty = preview.packFilePaths.length === 0`（与 spec 一致：以路径列表为准，等价于无行）。
  - 读取当前 `visibility`（可在同一次 `findUnique` 或在上一步 `preview` 后查询）。
  - `data: { packFilePaths, ...(empty && visibility === 'LISTED' ? { visibility: 'UNLISTED' } : {}) }`。

需 `import { PackVisibility } from "@/generated/prisma/client"` 并使用枚举而非魔法字符串。

- [ ] **Step 2: 手动验证思路**：CLI 上传 zip 非空 → LISTED → 若某流程清空库表（integration 后续）；单测可 mock `db.pack.update` 检查传入 `visibility`。若时间紧，**至少**在 PR 描述中写明已手测路径。

- [ ] **Step 3: Commit** `fix(web): unlist pack when source sync leaves no files`

---

### Task 4: `createEmptyPackForUserId` + `POST /api/packs/create`

**Files:**

- Create: `web/src/lib/pack-create-web.ts`
- Create: `web/src/app/api/packs/create/route.ts`

**实现要点（与 `web/src/app/api/packs/route.ts` POST 对齐）：**

1. `readSessionUserId()` 无则 401。
2. `user` 需 `handle` trim 非空，否则 400（文案可与 Bearer 路由一致）。
3. `assertValidSlug(slug)`；slug 冲突 → Prisma `P2002` → 409 或 400 + 明确 `error`。
4. `randomUUID()` 为 `id`；`ensurePackDirs()`；`zipBuf = await buildEmptyZipBuffer()`；`zipRelPath = await writeZipForPack(id, zipBuf)`（从 `@/lib/storage`）。
5. `prisma.pack.create`：`title: slug`，`visibility: UNLISTED`，`avatarRelPath: null`，`packFilePaths: []`。
6. `ingestZipToPackSource(prisma, id, zipBuf)`。
7. `extractPackFilePathsFromDb` + `buildAndStoreZipFromPackDb` + `prisma.pack.update` **或**直接调用 `syncPackDerivedAfterSourceChange(prisma, id)`（注意避免重复 `build` 两次；以 **单次 sync** 为准：若 `sync` 已包含 `extract`+`build`+`update`，则创建流里 **不要**再手写三遍）。

**推荐**：创建路径在 `ingest` 后 **只调** `syncPackDerivedAfterSourceChange`，与 `PATCH` 保存一致。

8. 成功返回 JSON：`{ ok: true, handle, slug, viewPath: "/packs/..." }`（`encodeURIComponent` 用于 path 拼接规则与现有一致）。

- [ ] **Step 1: 实现 lib + route**

- [ ] **Step 2: 本地 `pnpm --filter @openclaw-soul/web dev` + curl / 浏览器**：登录态 cookie，`POST /api/packs/create` `{"slug":"test-empty-xyz"}` → 200，详情页可打开。

- [ ] **Step 3: Commit** `feat(web): session POST /api/packs/create for empty pack`

---

### Task 5: `POST .../source-file` 创建 Markdown

**Files:**

- Modify: `web/src/app/api/packs/[handle]/[slug]/source-file/route.ts`

- [ ] **Step 1: 新增 `POST`**：

  - Session 与作者校验同 `PATCH`。
  - Body：`{ path: string, content: string }`（`content` 默认 `""`）。
  - `normalizeZipEntryPath(path)`；`!isMarkdownPath(normalized)` → 400。
  - 若已存在 md 或 bin 于该 path：`findFirst` 检查 → **409** `error: "path already exists"`。
  - `prisma.packMarkdownFile.create({ data: { packId, path: normalized, content } })`。
  - `await syncPackDerivedAfterSourceChange(prisma, pack.id)`。
  - 返回 `{ ok: true, path: normalized }`。

- [ ] **Step 2: 确认 `PATCH` 未改语义**（仍 404 无文件）。

- [ ] **Step 3: Commit** `feat(web): POST pack source-file to create markdown`

---

### Task 6: `publish` 与 `download` 空包拒绝

**Files:**

- Modify: `web/src/app/api/packs/[handle]/[slug]/publish/route.ts`
- Modify: `web/src/app/api/packs/[handle]/[slug]/download/route.ts`

- [ ] **Step 1: `publish`**：在 `update` 前 `if (await packIsSourceEmpty(prisma, pack.id)) return NextResponse.json({ error: "..." }, { status: 400 })`（仅当目标为首次 LISTED；已 LISTED idempotent 分支保持 `ok` — 但若空包+LISTED 不应出现，若出现可 400 或依赖 Task 3 已 UNLISTED）。

  **明确行为**：若 `visibility === LISTED` 且 `packIsSourceEmpty` → **400**（数据不一致修复前）；若已 LISTED 且非空 → 保持现有 idempotent。

- [ ] **Step 2: `download`**：resolve pack 后、`readStoredFile` 前：`if (await packIsSourceEmpty(prisma, pack.id)) return NextResponse.json({ error: "pack has no files" }, { status: 400 })`。

- [ ] **Step 3: Commit** `fix(web): reject publish and download for empty packs`

---

### Task 7: 详情页 + `PackPublish` + Download 按钮状态

**Files:**

- Modify: `web/src/app/packs/[handle]/[slug]/page.tsx`
- Modify: `web/src/app/packs/[handle]/[slug]/pack-publish.tsx`

- [ ] **Step 1: `page.tsx`**：

  - 计算 `const sourceEmpty = sourceFiles.length === 0`（或与 DB 一致；列表来自 server 查询，**应用** `sourceEmpty`）。
  - **作者**：`showPackFiles = isAuthor || (showPreview 原条件)` → 改为 **`isAuthor || (isListed && !sourceEmpty)`** 或与 spec 一致：**作者始终** `true` 显示「包内文件」区块：`const showAuthorSourceFiles = isAuthor`；访客保持 `showPreview = sourceFiles.length > 0 && (isAuthor || isListed)` 调整为：**作者始终展示**；**非作者** 仅 `isListed && sourceFiles.length > 0`（或原逻辑）。

  **精确 spec**：`{isAuthor ? <PackSourceFiles .../> : showPreview ? ...}` — 拆成：`isAuthor` 时总是渲染 `PackSourceFiles`；非作者仅在 `isListed && files.length` 时渲染（与 §5 一致）。

  - `PackPublishButton`：`disabled={sourceEmpty}`，`disabledReason` 可选。
  - Download 按钮：`render={<a>}` 改为：若 `sourceEmpty` 用 `Button disabled` + 说明，否则保持 `<a href={downloadUrl}>`。

- [ ] **Step 2: `pack-publish.tsx`**：`disabled` 时 `Button` `disabled` + `title` 提示。

- [ ] **Step 3: Commit** `feat(web): disable publish/download UI when pack has no source files`

---

### Task 8: `PackSourceFiles` 空态与新建

**Files:**

- Modify: `web/src/app/packs/[handle]/[slug]/pack-source-files.tsx`

- [ ] **Step 1: 删除** `if (sorted.length === 0) return null;`，改为空态 Card：说明 + 输入框（相对路径，placeholder `SOUL.md`）+「创建」→ `POST` body `{ path, content: "" }`。

- [ ] **Step 2: 成功后** `router.refresh()`，选中新建 path。

- [ ] **Step 3: 处理 409/400** 错误文案展示。

- [ ] **Step 4: Commit** `feat(web): empty pack source files and create markdown`

---

### Task 9: Dashboard Dialog

**Files:**

- Create: `web/src/app/dashboard/create-pack-dialog.tsx`
- Modify: `web/src/app/dashboard/page.tsx`

- [ ] **Step 1:** 在「在本机 workspace 发布」**上方** `<li>` 插入新行：图标可选 `Sparkles`/`FilePlus`；点击打开 `CreatePackDialog`（client）。

- [ ] **Step 2:** Dialog：slug 输入、提交 loading、`fetch('/api/packs/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }), credentials: 'include' })`；成功 `router.push(\`/packs/${handle}/${slug}\`)`（handle 从 API 返回或已知 `user.handle` — **优先 API 返回** 避免竞态）。

- [ ] **Step 3:** 无 handle 时与现有 Card 一致：不显示创建入口或显示禁用 + 引导 tokens（与 spec「无 handle 时一致」）。

- [ ] **Step 4: Commit** `feat(web): dashboard create pack from web dialog`

---

### Task 10: 验收与文档收尾

- [ ] **Step 1:** `pnpm --filter @openclaw-soul/web test` 与 `pnpm --filter @openclaw-soul/web lint` 通过。

- [ ] **Step 2:** 手动流程：dashboard 创建 → 空包无法上架/下载 → POST 创建 `SOUL.md` → 可上架、可下载。

- [ ] **Step 3:** 更新 [`docs/ROADMAP.md`](../../ROADMAP.md) P1-D 行「完成」列（若团队习惯在功能合并时勾选）。

- [ ] **Step 4: Commit** `docs: mark P1-D complete in ROADMAP`（若改了 ROADMAP）。

---

## Self-review（对照 spec）

| Spec § | Task |
| --- | --- |
| Session 创建空 pack | Task 4 |
| POST 创建 / PATCH 仅更新 | Task 5 |
| 空包禁止上架/下载 | Task 6 + 7 |
| 同步后自动 UNLISTED | Task 3 |
| Dashboard 入口 + Dialog | Task 9 |
| 作者始终「包内文件」+ 空态新建 | Task 7 + 8 |

**Placeholder scan：** 无 TBD；错误码已写明 400/409。

**类型：** `PackVisibility` 枚举与 Prisma 一致；`create` 返回类型与前端 `fetch` 解析一致。

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-07-p1-d-web-create-pack.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，任务间 review，迭代快  

**2. Inline Execution** — 本会话按 `executing-plans` 批量执行并设检查点  

**Which approach?**
