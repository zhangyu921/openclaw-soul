export function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "slug must be lowercase letters, digits, and hyphens (e.g. workspace-asuka)"
    );
  }
}
