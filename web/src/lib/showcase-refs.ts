/**
 * `Pack.showcaseImageRefs` 在 Prisma 中为 Json；规范化为 string[]。
 */
export function normalizeShowcaseImageRefs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}
