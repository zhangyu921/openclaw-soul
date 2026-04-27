# P2-F Gallery Search — Database-Level Design

> **Status:** Design draft. No UI implementation in this phase.

**Goal:** Enable keyword search over the gallery listing so users can find
Souls by title, summary, or slug without scrolling the full list.

**Task doc:** [`docs/harness/task-p2-f-1.md`](../../harness/task-p2-f-1.md)

---

## 1. Searchable Fields

| Field | Type | Priority | Notes |
|-------|------|----------|-------|
| `title` | `String` | **Primary** | The display title shown on gallery cards. |
| `summary` | `String?` | Secondary | Short description; null for many packs. |
| `slug` | `String` | Secondary | Useful for exact-handle lookups. |
| `showcaseMd` | `String?` | Deferred | Markdown body; too heavy for MVP, revisit later. |
| `author.handle` | `String?` | Deferred | "Find souls by author X"; separate filter, not MVP. |

**MVP scope:** `title`, `summary`, `slug` with `ILIKE` matching. No full-text
index required at current data scale (< 1000 packs projected).

---

## 2. API Contract

### `GET /api/packs?search=<keyword>`

Same as the current gallery endpoint, with an optional `search` query param.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `string?` | — | Free-text keyword. Empty/missing = no filter (current behavior). |

**Response:** Same shape as `GET /api/packs` — `{ packs: [...] }`.

**Query logic (Prisma):**

```ts
const where: Prisma.PackWhereInput = {
  visibility: PackVisibility.LISTED,
  author: { handle: { not: null } },
  authorDashboardHiddenAt: null,
};

if (search && search.trim()) {
  const keyword = search.trim();
  where.OR = [
    { title: { contains: keyword, mode: 'insensitive' } },
    { summary: { contains: keyword, mode: 'insensitive' } },
    { slug: { contains: keyword, mode: 'insensitive' } },
  ];
}
```

**Edge cases:**
- Empty/whitespace `search` → ignore filter, return all.
- Very short keyword (≤ 2 chars) → still query; DB handles it.
- No results → return `{ packs: [] }` (same as empty gallery).
- SQL injection → Prisma parameterized queries prevent this.

---

## 3. Index Strategy

### MVP (current scale)

No new index required. PostgreSQL sequential scan with `ILIKE` on `title`
and `summary` is acceptable at hundreds of rows. `slug` already has an
implicit index via the `@@unique([authorId, slug])` constraint.

### Scale-up (when > 1000 listed packs)

Add a GIN trigram index for `ILIKE` performance:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_pack_title_trgm ON "Pack" USING gin ("title" gin_trgm_ops);
CREATE INDEX idx_pack_summary_trgm ON "Pack" USING gin ("summary" gin_trgm_ops);
```

Or, if PostgreSQL full-text search is preferred:

```sql
-- Add a generated tsvector column (requires Prisma migrate)
ALTER TABLE "Pack" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("summary", '')), 'B')
  ) STORED;

CREATE INDEX idx_pack_search_vector ON "Pack" USING gin ("searchVector");
```

The full-text approach supports ranking (`ts_rank`) and stemming but adds
schema complexity. Defer until scale demands it.

---

## 4. UI Contract (not this phase)

For reference only — the UI will be a separate implementation task.

1. **Search input** in the gallery header area (above the card grid).
2. **Debounced** (300ms) to avoid excessive API calls.
3. **`?search=` query param** in the URL for shareable/search-engine-friendly
   URLs.
4. **Empty state**: "No Souls match your search" with a clear/reset action.
5. **Loading state**: Skeleton cards or subtle spinner while fetching.

---

## 5. Acceptance Criteria (design phase)

- [ ] API design documented (query param, response shape, edge cases).
- [ ] Index strategy chosen (MVP: no new index; scale-up plan documented).
- [ ] Sample queries validated against current schema.
- [ ] No Prisma schema changes in MVP.
- [ ] No UI code in this phase.

---

## 6. Sample Query Validation

```sql
-- Current gallery query (baseline)
SELECT "title", "slug", "summary" FROM "Pack"
WHERE "visibility" = 'LISTED'
  AND "authorDashboardHiddenAt" IS NULL
ORDER BY "createdAt" DESC;

-- With search (ILIKE on Postgres)
SELECT "title", "slug", "summary" FROM "Pack"
WHERE "visibility" = 'LISTED'
  AND "authorDashboardHiddenAt" IS NULL
  AND (
    "title" ILIKE '%keyword%'
    OR "summary" ILIKE '%keyword%'
    OR "slug" ILIKE '%keyword%'
  )
ORDER BY "createdAt" DESC;
```

---

## 7. Remaining Risk

- **Sample size**: Gallery currently has few packs; search UX value scales
  with content volume. The feature should be built but its user-facing value
  may be low until more packs are published.
- **i18n**: Chinese text search with `ILIKE` works on PostgreSQL with
  `UTF8` encoding. For CJK-aware search at scale, `pg_bigm` extension
  (bigram) may be preferable to `pg_trgm`.
