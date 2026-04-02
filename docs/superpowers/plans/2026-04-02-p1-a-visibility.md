# P1-A `visibility`（UNLISTED / LISTED）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Pack.visibility` as the single source of truth for gallery and anonymous access; default new uploads to `UNLISTED`; CLI/apply behavior and Web surfaces per [`docs/superpowers/specs/2026-04-02-p1-a-visibility-design.md`](../specs/2026-04-02-p1-a-visibility-design.md).

**Architecture:** Add Prisma enum + column, data migration from `revokedAt`, then thread `visibility` through API routes (`POST /api/packs`, pack `GET`, download, list/unlist), server pages (gallery, dashboard, detail), and CLI (`publish` multipart + `apply` Bearer download + draft prompt). Retire business use of `revokedAt` after migration.

**Tech Stack:** Next.js App Router, Prisma/Postgres, `@openclaw-soul/cli` (Commander, `form-data`, `fetchRegistry`).

---

## File map (expected touch list)

| Area | Files |
|------|--------|
| Schema | `web/prisma/schema.prisma`, new migration under `web/prisma/migrations/` |
| Lookup | `web/src/lib/pack-lookup.ts` |
| API | `web/src/app/api/packs/route.ts`, `web/src/app/api/packs/[handle]/[slug]/route.ts`, `web/src/app/api/packs/[handle]/[slug]/download/route.ts`, `web/src/app/api/packs/[handle]/[slug]/revoke/route.ts` (+ optional new `publish` route if split) |
| UI | `web/src/app/page.tsx`, `web/src/app/dashboard/page.tsx`, `web/src/app/packs/[handle]/[slug]/page.tsx`, `web/src/app/packs/[handle]/[slug]/pack-revoke.tsx` (rename/repurpose) |
| CLI | `packages/cli/src/publish-pack.ts`, `packages/cli/src/index.ts`, `packages/cli/src/zip-utils.ts` (or `fetch-registry` usage), `packages/cli/README.md` if user-facing |
| Tests | `packages/cli/test/*`, any `web` tests if present |

---

### Task 1: Prisma enum + migration

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/<timestamp>_pack_visibility/migration.sql` (via `pnpm exec prisma migrate dev`)

- [ ] **Step 1:** Add `enum PackVisibility { UNLISTED LISTED }` and `visibility PackVisibility` on `Pack` with default `LISTED` temporarily (or `UNLISTED` + SQL fix — prefer one migrate step: add nullable column, backfill, set `@default`, make non-null).
- [ ] **Step 2:** Migration SQL: for each row, `visibility = CASE WHEN "revokedAt" IS NOT NULL THEN 'UNLISTED' ELSE 'LISTED' END`; then drop `revokedAt` **or** keep column unused (spec allows; prefer drop if no FK). Run migrate against dev DB.
- [ ] **Step 3:** `pnpm exec prisma generate` in `web/`. Commit migration + schema.

---

### Task 2: `findPackByHandleAndSlug` and callers

**Files:**
- Modify: `web/src/lib/pack-lookup.ts`

- [ ] **Step 1:** Replace `{ revokedAt: null }` filter with `{ visibility: 'LISTED' }` for **public** lookup; add options e.g. `allowUnlistedForAuthor` + session/userId checks at call sites **or** keep two helpers: `findPackPublicListed` vs `findPackForAuthorOrListed`.
- [ ] **Step 2:** Grep `revokedAt` / `allowRevoked` in `web/` and update.

---

### Task 3: `POST /api/packs` (create / replace)

**Files:**
- Modify: `web/src/app/api/packs/route.ts`

- [ ] **Step 1:** Parse multipart `visibility` (string `UNLISTED` | `LISTED`); missing → `UNLISTED`. Invalid → **400** JSON error per spec.
- [ ] **Step 2:** On **create**, set `visibility` from form. On **`replace`**: if spec says preserve — when `replace` and no `visibility` in form, keep existing row’s `visibility`; if `visibility` provided, update it.
- [ ] **Step 3:** Response JSON includes `visibility` (and existing fields). `recordPublishRateLimit` still on success (per spec default: count UNLISTED too).

---

### Task 4: `GET /api/packs` (gallery JSON) + home gallery

**Files:**
- Modify: `web/src/app/api/packs/route.ts` (`GET`), `web/src/app/page.tsx`

- [ ] **Step 1:** `where: { visibility: 'LISTED', author: { handle: { not: null } } }`.

---

### Task 5: `GET /api/packs/[handle]/[slug]` (pack JSON)

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/route.ts`

- [ ] **Step 1:** Anonymous / no session: return pack only if `visibility === 'LISTED'` (same as today’s “public” pack).
- [ ] **Step 2:** Accept `Authorization: Bearer` for API token: if token resolves to author and pack is `UNLISTED`, return pack including `visibility`. (Session cookie optional for browser; align with how other routes authenticate.)
- [ ] **Step 3:** Include `visibility` in JSON for clients that need it (CLI `apply`).

---

### Task 6: Download route (author-only for UNLISTED)

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/download/route.ts`
- Possibly: `web/src/lib/token-api.ts` (reuse `findUserIdByApiToken`)

- [ ] **Step 1:** If pack `visibility === 'LISTED'`, keep current behavior (public zip).
- [ ] **Step 2:** If `UNLISTED`, require `Authorization: Bearer` and **authorId** match; else **404** (or **401** — pick one per spec §3 and use consistently).
- [ ] **Step 3:** `findPackByHandleAndSlug` must load unlisted packs for **auth** path (by id after token check).

---

### Task 7: Unlist / list (revoke route)

**Files:**
- Modify: `web/src/app/api/packs/[handle]/[slug]/revoke/route.ts` (or rename to `unlist` in a follow-up)

- [ ] **Step 1:** Set `visibility = UNLISTED` instead of `revokedAt`. Idempotent: already `UNLISTED` → **200** with `{ visibility: 'UNLISTED' }`.
- [ ] **Step 2:** Add **`POST .../publish`** (or `PATCH` pack) setting `visibility = LISTED`, author-only, idempotent.

---

### Task 8: Pack detail page + dashboard

**Files:**
- Modify: `web/src/app/packs/[handle]/[slug]/page.tsx`, `web/src/app/packs/[handle]/[slug]/pack-revoke.tsx`, `web/src/app/dashboard/page.tsx`

- [ ] **Step 1:** Detail: `UNLISTED` visible only to author (same as `revoked` + author today); anonymous `notFound()`.
- [ ] **Step 2:** Replace `revokedAt` / `isRevoked` with `visibility`; labels per spec (“公开中 / 未公开”).
- [ ] **Step 3:** Dashboard: query `visibility` instead of `revokedAt`; “上架” button calls publish endpoint when `UNLISTED`.

---

### Task 9: CLI `publish`

**Files:**
- Modify: `packages/cli/src/publish-pack.ts`, `packages/cli/src/index.ts` (publish command options)

- [ ] **Step 1:** Add `PublishPackInput.visibility` or `listed?: boolean`; default `UNLISTED`; append `visibility` to `FormData`.
- [ ] **Step 2:** Add flag e.g. `--public` / `--listed` → `LISTED`.
- [ ] **Step 3:** Extend `PublishPackResult` with `visibility`; validate JSON. TTY: after success, print draft notice + hint for `--public`.
- [ ] **Step 4:** On `replace` without flag, do **not** send `visibility` (server preserves) — confirm `publish-pack` omits field when undefined.

---

### Task 10: CLI `apply`

**Files:**
- Modify: `packages/cli/src/index.ts`, `packages/cli/src/zip-utils.ts` (or inline)

- [ ] **Step 1:** Load token from env/config (same as publish). `GET` `${api}/api/packs/${h}/${s}` with `Authorization: Bearer` to read `visibility` (and existence).
- [ ] **Step 2:** If `UNLISTED`, TTY: extra message “当前为草稿/未公开” before existing confirm; `-y` skips (same as existing apply).
- [ ] **Step 3:** `downloadToFile(zipUrl, tmp, { headers: { Authorization: `Bearer ${token}` } })` when pack is UNLISTED; extend `downloadToFile` / `fetchRegistry` call to pass headers.
- [ ] **Step 4:** If `LISTED`, download without Bearer (current behavior).

---

### Task 11: Tests + docs

**Files:**
- Modify: `packages/cli/test/cli-integration.test.ts` or add tests; `docs/DEVELOPMENT.md` if env/flags documented

- [ ] **Step 1:** Add/adjust tests for CLI response parsing and apply flow (mock registry if needed).
- [ ] **Step 2:** Manual checklist: gallery only LISTED; anonymous detail 404 for UNLISTED; author sees detail; download UNLISTED with token only; publish/unlist.

---

## Plan review

After implementation, run tests (`pnpm test` / package scripts per `package.json`) and follow `docs/superpowers/specs/2026-04-02-p1-a-visibility-design.md` §6.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-02-p1-a-visibility.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
