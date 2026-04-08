export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeMessagesWithFallback(
  fallback: Record<string, unknown>,
  primary: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(primary)) {
    const p = primary[key];
    const f = fallback[key];
    if (p === undefined || p === null) {
      continue;
    }
    if (isPlainObject(p) && isPlainObject(f)) {
      out[key] = mergeMessagesWithFallback(f, p);
    } else {
      out[key] = p;
    }
  }
  return out;
}
