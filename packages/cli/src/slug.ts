const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "slug must be lowercase letters, digits, and hyphens (e.g. workspace-asuka)"
    );
  }
}

/** Turn a persona display name into a slug fragment (may still need validateSlug). */
export function slugifyDisplayName(raw: string): string {
  const t = raw
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return t || "persona";
}
