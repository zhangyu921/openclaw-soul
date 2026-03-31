# Short validation experiment (B + A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Within the suggested ~2 week window (see spec), satisfy **B** (site explains itself well enough to recommend) and **A** (one non-author completes the path with agreed evidence), without expanding scope beyond narrative, light UX, and ops.

**Architecture:** Spec [`docs/superpowers/specs/2026-03-31-openclaw-soul-direction-design.md`](../specs/2026-03-31-openclaw-soul-direction-design.md) is source of truth. **B** is mostly **copy and information hierarchy** on existing Next.js routes (`/`, `/packs/[handle]/[slug]`). **A** is **process**: lock evidence criteria, run one outreach loop, record outcome (optional lightweight log file in repo or private notes).

**Tech Stack:** Next.js App Router (`web/`), Prisma, existing UI components; no new backend features required for MVP of this plan.

**Related spec:** `docs/superpowers/specs/2026-03-31-openclaw-soul-direction-design.md` (§5–§8).

---

## File map (before tasks)

| Area | Responsibility |
|------|------------------|
| `web/src/app/page.tsx` | Home / gallery hero, pack grid, empty state — **B** |
| `web/src/app/packs/[handle]/[slug]/page.tsx` | Pack title, summary, preview, CLI apply block — **B** |
| `README.md` (repo root) | First-run visitor path; may add one line pointing to site + spec thesis — **B** (optional) |
| `docs/superpowers/experiment-log.md` (create) | **A**: dated evidence line + method (or keep private; if private, note in plan that gate is satisfied offline) |

---

### Task 1: Lock **A** evidence (before outreach)

**Files:**
- Create: `docs/superpowers/experiment-log.md` (optional; can be gitignored local copy — if so, document in Task 1 Step 3)

- [ ] **Step 1:** Write one paragraph: what counts as 「愿意继续」 (e.g. DM screenshot with consent, public reply, or scheduled follow-up call). Include **how** you will collect it without ambiguity.

- [ ] **Step 2:** Name one **可见入口** you will use (e.g. tweet, friend DM, Discord) so 「从可见入口进入」 is not retrofitted.

- [ ] **Step 3:** Save to `docs/superpowers/experiment-log.md` **or** `docs/superpowers/experiment-log.example.md` in repo with placeholders, and keep real PII out of git if needed.

- [ ] **Step 4:** Commit if the file is safe to version (e.g. template only).

```bash
git add docs/superpowers/experiment-log.md
git commit -m "docs: add experiment log template for A evidence"
```

---

### Task 2: **B** — Home / gallery (`/`)

**Files:**
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1:** Read current hero (Badge, `h1`, subtitle, `apply` one-liner). Against spec §5.2: does a **stranger** understand **这是什么、为谁、如何得到同款** in &lt; 60s? List gaps in a bullet list (comment in PR or issue).

- [ ] **Step 2:** Edit copy only (no new routes): align **情感向 / 人设** thesis if desired — still accurate for functional packs. Keep `npx @openclaw-soul/cli apply` visible.

- [ ] **Step 3:** Empty state (`packs.length === 0`): ensure CTA still points to `publish` and matches voice.

- [ ] **Step 4:** Run lint and build for `web`:

```bash
cd web && pnpm exec eslint . && pnpm run build
```

Expected: ESLint clean; Next.js build succeeds.

- [ ] **Step 5:** Commit:

```bash
git add web/src/app/page.tsx
git commit -m "fix(web): tighten gallery copy for B narrative"
```

---

### Task 3: **B** — Pack detail (`/packs/[handle]/[slug]`)

**Files:**
- Modify: `web/src/app/packs/[handle]/[slug]/page.tsx`

- [ ] **Step 1:** Above the fold: ensure **title + summary** (author-editable via existing UI) are the primary 「这人设干嘛的」 surface. If summary is often empty, add **one line** of neutral helper in UI for authors only (reuse existing edit components) — only if product decision says so; otherwise skip code and rely on showcase pack content.

- [ ] **Step 2:** CLI card: confirm `apply` command + OpenClaw workspace doc link already satisfy 「如何得到同款」; adjust `CardDescription` wording if needed for emotional-framing consistency.

- [ ] **Step 3:** `pnpm run build` in `web/` as in Task 2.

- [ ] **Step 4:** Commit if any change.

---

### Task 4: **B** — Optional README bridge

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Add a short subsection or sentence: **why** this exists (persona packs / workspace apply) and link to the spec or site — only if not redundant with existing README.

- [ ] **Step 2:** Commit.

---

### Task 5: Execute **A** (ops, not code)

- [ ] **Step 1:** One outreach attempt using the locked **可见入口**.

- [ ] **Step 2:** Help the user through `login` → `apply` if needed (screen share / written steps from `README.md` / `docs/DEVELOPMENT.md`).

- [ ] **Step 3:** Record outcome in experiment log per Task 1.

- [ ] **Step 4:** No commit unless updating anonymized template.

---

### Task 6: Timeboxed **复盘** (spec §4, §8)

- [ ] **Step 1:** On or before **4-week cap** from experiment start (earlier if A+B done): fill §4 decision (**继续** / **Pivot** / **缩小** / **Pause**) with one sentence each for B and A.

- [ ] **Step 2:** If **继续**, open a follow-up plan or issue list for next slice (registry URL migration, deeper gallery, etc.) — YAGNI until this gate passes.

---

## Testing notes

- No new automated tests are mandatory for copy-only changes; **manual** pass: incognito window, cold visit `/` and one pack detail, 60s comprehension check.
- If Playwright or similar exists later, optional snapshot of hero text — not required for this plan.

---

## Plan review

- Reviewer should verify: tasks map to spec §5–§8; file paths exist; **A** is not all code (ops explicitly listed).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-31-short-validation-b-plus-a.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks.

**2. Inline execution** — Run tasks in one session with checkpoints after Task 2 and Task 3.

Which approach do you want?
