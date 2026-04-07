/**
 * Default USER.md body for the chat dialog when the pack has no `USER.md`.
 * Placeholders use `${name}` syntax; replace with {@link applyUserMdPlaceholders}.
 */
export const DEFAULT_USER_MD_TEMPLATE = [
  "# USER.md - About Your Human",
  "",
  "_Learn about the person you're helping. Update this as you go._",
  "",
  "- **Name:** ${userHandle}",
  "- **What to call them:** ${userHandle}",
  "- **Pronouns:** _(optional)_ ${pronouns}",
  "- **Timezone:** ${timezone}",
  "- **Notes:**",
  "",
  "## Context",
  "",
  "_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_",
  "",
  "---",
  "",
  "The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.",
  "",
  "<!-- pack: ${packHandle}/${packSlug} -->",
].join("\n");

export type UserMdPlaceholders = {
  /** Logged-in user's public handle (used for Name / call them). */
  userHandle: string;
  /** Author handle on this pack page. */
  packHandle: string;
  /** Pack slug. */
  packSlug: string;
  timezone: string;
  pronouns?: string;
};

export function applyUserMdPlaceholders(
  template: string,
  p: UserMdPlaceholders
): string {
  return template
    .replace(/\$\{userHandle\}/g, p.userHandle)
    .replace(/\$\{packHandle\}/g, p.packHandle)
    .replace(/\$\{packSlug\}/g, p.packSlug)
    .replace(/\$\{timezone\}/g, p.timezone)
    .replace(/\$\{pronouns\}/g, p.pronouns ?? "");
}
