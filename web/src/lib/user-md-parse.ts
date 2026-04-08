export type ParsedUserFields = Partial<
  Record<"name" | "whatToCall" | "pronouns" | "timezone" | "notes" | "context", string>
>;

const BULLET_LABELS: { key: keyof ParsedUserFields; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "whatToCall", label: "What to call them" },
  { key: "pronouns", label: "Pronouns" },
  { key: "timezone", label: "Timezone" },
  { key: "notes", label: "Notes" },
];

/** Strip template placeholders like _(optional)_ at the start of a bullet value. */
export function stripBulletValueNoise(v: string): string {
  let s = v.trim();
  s = s.replace(/^\s*_\s*\(optional\)\s*_\s*/i, "");
  s = s.replace(/^\s*_\s*optional\s*_\s*/i, "");
  s = s.replace(/^\s*\(optional\)\s*/i, "");
  return s.trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match `- **Label:** value` on a single line (value may be empty).
 */
function parseBulletLine(raw: string, label: string): string | undefined {
  const re = new RegExp(
    `^\\s*-\\s*\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.*)$`,
    "im"
  );
  const m = raw.match(re);
  if (!m?.[1]) return undefined;
  const cleaned = stripBulletValueNoise(m[1]);
  return cleaned || undefined;
}

/**
 * Content under `## Context` until a thematic break `---` on its own line, or next `##`, or EOF.
 * Does not include the standard footer after `---` (“The more you know…”).
 */
export function parseContextSection(raw: string): string | undefined {
  const startIdx = raw.search(/##\s*Context\b/im);
  if (startIdx < 0) return undefined;
  const after = raw.slice(startIdx).replace(/^##\s*Context\s*/i, "");
  const lines = after.split(/\r?\n/);
  const buf: string[] = [];
  for (const line of lines) {
    const t = line.trimEnd();
    if (/^\s*---\s*$/.test(t)) break;
    if (/^##\s+\S/.test(t)) break;
    buf.push(line);
  }
  const ctx = buf.join("\n").trim();
  if (!ctx) return undefined;
  // Drop the default italic placeholder line if present (template / empty context)
  if (
    /^\s*_\(\s*What do they care about/i.test(ctx) &&
    /Build this over time/i.test(ctx)
  ) {
    return undefined;
  }
  return ctx;
}

/**
 * Best-effort parse of pack `USER.md` (or saved USER block) into form fields.
 * On failure or empty input, returns {}.
 */
export function parsePackUserMd(raw: string): ParsedUserFields {
  if (!raw || typeof raw !== "string") return {};
  const out: ParsedUserFields = {};
  for (const { key, label } of BULLET_LABELS) {
    const v = parseBulletLine(raw, label);
    if (v) out[key] = v;
  }
  const ctx = parseContextSection(raw);
  if (ctx) out.context = ctx;
  return out;
}
