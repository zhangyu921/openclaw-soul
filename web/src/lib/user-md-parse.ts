export type ParsedUserFields = Partial<
  Record<"name" | "whatToCall" | "pronouns" | "timezone" | "notes" | "context", string>
>;

const FIELD_PATTERNS: { key: keyof ParsedUserFields; re: RegExp }[] = [
  { key: "name", re: /^\s*-\s*\*\*Name:\*\*\s*(.*)$/im },
  { key: "whatToCall", re: /^\s*-\s*\*\*What to call them:\*\*\s*(.*)$/im },
  { key: "pronouns", re: /^\s*-\s*\*\*Pronouns:\*\*\s*(.*)$/im },
  { key: "timezone", re: /^\s*-\s*\*\*Timezone:\*\*\s*(.*)$/im },
  { key: "notes", re: /^\s*-\s*\*\*Notes:\*\*\s*(.*)$/im },
];

/**
 * Best-effort parse of pack `USER.md` into form fields. On failure or empty input, returns {}.
 */
export function parsePackUserMd(raw: string): ParsedUserFields {
  if (!raw || typeof raw !== "string") return {};
  const out: ParsedUserFields = {};
  for (const { key, re } of FIELD_PATTERNS) {
    const m = raw.match(re);
    if (m?.[1] != null) {
      const v = m[1].replace(/^\s*\(_optional\)_\s*/i, "").trim();
      if (v) out[key] = v;
    }
  }
  const ctxMatch = raw.match(/##\s*Context\s*([\s\S]*)$/im);
  if (ctxMatch?.[1]) {
    const ctx = ctxMatch[1].trim();
    if (ctx) out.context = ctx;
  }
  return out;
}
