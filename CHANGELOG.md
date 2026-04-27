# Changelog

## 2026-04-27

- **Pack Chat — DeepSeek API** (#19): Chat provider picker added to pack
  detail; authors can select DeepSeek (`deepseek-chat` / `deepseek-reasoner`)
  alongside the default provider. API key configured via site-wide
  `DEEPSEEK_API_KEY`.
- **Prisma 7.5.0 → 7.8.0**: Dependency upgrade.
- **Vercel region `iad1` → `sin1`**: Singapore deployment to co-locate
  functions with Neon DB (P3-D-1).

## 2026-04-26

- **Gallery view counts** (#18, P2-T-1): Pack cards on the home gallery now
  show view count (> 10) on the title row. `profileViewCount` increments per
  non-author detail-page open.
- **Detail hero apply copy** (#17, P2-S-1): Detail page hero card now
  includes a click-to-copy CLI snippet (`ocs apply <handle>/<slug>`). The
  bottom CLI card is retained with simpler copy.
- **Brand-mark favicon** (P2-U-1): Shared `brand-mark.svg` now powers both
  the Header logo (`next/image`) and site favicon (`generateMetadata.icons`).
- **Performance**: `unstable_cache` on home gallery list and avatar metadata;
  stronger image `Cache-Control` headers.
- **Fix**: Streamdown code-block controls (copy, download) now usable.

## 2026-04-25

- **Chat share to Experience** (#16, P2-Q-1): Authors can share the current
  chat as a long screenshot to the pack's Experience image gallery (up to
  10). Canvas-based bubble rendering + client-side upload.
- **Header layout** (P2-R-1): Language and theme toggles moved next to the
  brand title area.
- **Language switcher** (P2-P-1): Globe icon opens a dialog to switch locale
  (`en` / `zh`).
- **Header responsive** (P2-O-1): Narrow viewport now hides or shrinks
  branding to prevent wrapping.

## 2026-04-24

- **Lazy pack zip** (#13, P2-K-1): Zip is no longer regenerated on every
  markdown or source-file edit. It is built on-demand at download/apply time
  and cached to blob storage.
- **My Souls removal** (#14, P2-L-1): Authors can remove a pack from their
  dashboard list (DB mark + slug release; listing hidden).
- **Chat typing indicator** (#15, P2-M-1): During streaming generation the
  chat shows a typing indicator; no intermediate reasoning text is exposed.
- **Showcase → Experience**: The detail-page "Showcase" section has been
  renamed to "Experience" across all locales.
- **Chat localStorage + New Chat** (#12, P2-I-1): Pack chat conversations
  persist in `localStorage`; a "New Chat" button clears the thread.
- **Login entry integration** (#11, P2-G-1): GitHub OAuth is now the primary
  login entry; email-based login/register is moved to separate pages.

## 2026-04-23

- **Soul detail deferred loading** (P2-N-1): Detail page no longer loads
  file contents eagerly; shows file list only, previews load on click.
- **Avatar upload refresh fix** (P2-J-1): Second avatar upload now correctly
  refreshes the displayed image.
- **Auto-redirect after pack creation** (P2-H-1): Creating a pack from the
  dashboard now redirects to the detail page.

## 2026-04-22

- **Header brand refresh** (P2-E-1): Header branding and hero visual
  overhaul — new SVG logo mark, refined spacing and type.

## 2026-04-10

- **P2-C site copy & i18n**: All remaining pages localized (`en`/`zh`);
  `next-intl` messages now cover the full user-facing surface. Product
  naming aligned: "Soul" in user-facing copy, "pack" only in technical
  contexts.

## 2026-04-09

- **P2-B home information architecture**: Home page restructured into
  three clear sections with benefit-first messaging.

## 2026-04-08

- **P2-A web i18n**: `/[locale]` routing introduced (`en`/`zh`),
  `next-intl` + `messages/*.json`; all routes locale-aware.

## 2026-04-07

- **P1-D web create pack**: Users can create a pack directly from the
  dashboard ("Build your SOUL from scratch"), entering a slug and landing
  on the new detail page with editable source files.

## 2026-04-06

- **P1-C instant chat**: Multi-turn chat on pack detail pages; context
  is injected from the pack's system/user-side files. Available for
  logged-in users on visible packs.

## 2026-04-04

- **P1-B-4 online Markdown editing**: Detail page "source files" section
  shows Markdown file list with GFM preview; authors can edit and save,
  triggering zip rebuild and SOUL summary recalculation.
- **P1-B-3 detail showcase**: Showcase section on detail page with
  Markdown body and image gallery (up to 10, scrollable, lightbox).

## 2026-04-03

- **P1-B-2 upload & edit UX**: Display title editable on web; CLI
  publish wizard streamlined (no title/summary/avatar prompts; default
  title from IDENTITY or slug). Overwrite preserves gallery status.
  Unlisted pack avatar GET now consistent with JSON visibility.
- **Pack source-of-truth DB-only**: Removed PackArtifactSource; all
  pack content lives in `PackMarkdownFile` + `PackBinaryFile` rows.

## 2026-04-02

- **P1-B-1 DB source-of-truth + on-demand zip**: Markdown/binary
  content stored directly in DB at upload; zip generated on-demand
  for apply/download.
- **P1-A visibility**: New packs default to UNLISTED (draft); authors
  manage gallery listing via web UI. CLI `--public` flag for direct
  listing. Visibility preserved across `--replace` uploads.
- **CLI publish wizard**: Non-interactive default subset = `SOUL.md`
  + `IDENTITY.md` (when present); `MEMORY.md` excluded by default
  (`--include MEMORY.md` to opt in). Interactive wizard asks whether
  to upload full workspace first.

## 2026-03-31

- **CLI v0.0.10**: Publish wizard no longer prompts for display
  title/summary/avatar. Fix: replace no longer forces UNLISTED.
- **CLI v0.0.9**: Default pack subset refined; `MEMORY.md` opt-in.

## 2026-03

- **P0 complete**: Production Postgres (Neon) + Prisma, Vercel Blob
  storage, stable deployment. CLI `publish` + `apply` loop validated.
- **CLI v0.0.6 – v0.0.8**: Device-flow login, visibility control,
  upload/apply flow, registry pack metadata fetch.
