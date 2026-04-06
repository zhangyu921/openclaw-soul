import type { ParsedUserFields } from "./user-md-parse";

/** Canonical USER block for system prompt (spec §4.3). */
export function buildUserBlockMarkdown(fields: ParsedUserFields): string {
  const name = fields.name ?? "";
  const whatToCall = fields.whatToCall ?? "";
  const pronouns = fields.pronouns ?? "";
  const timezone = fields.timezone ?? "";
  const notes = fields.notes ?? "";
  const context = fields.context ?? "";

  return `# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:** ${name}
- **What to call them:** ${whatToCall}
- **Pronouns:** _(optional)_ ${pronouns}
- **Timezone:** ${timezone}
- **Notes:** ${notes}

## Context

${context || "_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_"}

---

The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.
`;
}
