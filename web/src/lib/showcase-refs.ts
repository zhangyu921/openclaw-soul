/**
 * `Pack.showcaseImageRefs` 在 Prisma 中为 Json。
 * - 兼容旧数据：`string[]`（仅路径）
 * - 新数据：`{ ref, width?, height? }[]`（上传时写入像素尺寸，供画廊稳定布局）
 */
export type ShowcaseImageRef = {
  ref: string;
  width?: number;
  height?: number;
};

function clampDim(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  const x = Math.round(n);
  if (x < 1 || x > 65535) return undefined;
  return x;
}

export function normalizeShowcaseImageRefs(raw: unknown): ShowcaseImageRef[] {
  if (!Array.isArray(raw)) return [];
  const out: ShowcaseImageRef[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.length > 0) {
      out.push({ ref: x });
      continue;
    }
    if (typeof x === "object" && x !== null && "ref" in x) {
      const ref = (x as { ref: unknown }).ref;
      if (typeof ref !== "string" || ref.length === 0) continue;
      const width = clampDim((x as { width?: unknown }).width);
      const height = clampDim((x as { height?: unknown }).height);
      const entry: ShowcaseImageRef = { ref };
      if (width !== undefined) entry.width = width;
      if (height !== undefined) entry.height = height;
      out.push(entry);
    }
  }
  return out;
}
