import { readIdentityDefaults } from "./read-identity.js";

/** Display title for publish: explicit `--title`, else IDENTITY Name, else slug. */
export function resolvePublishTitle(
  sourceDir: string,
  slug: string,
  explicitTitle: string
): string {
  const t = explicitTitle.trim();
  if (t) return t;
  return readIdentityDefaults(sourceDir)?.displayName ?? slug;
}
