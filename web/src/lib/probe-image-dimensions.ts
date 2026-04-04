import imageSize from "image-size";

/** 从已上传 buffer 读取像素尺寸（用于 showcase 等，避免前端 onLoad 再量宽导致布局跳动）。 */
export function probeImageDimensions(buf: Buffer): { width: number; height: number } | null {
  try {
    const r = imageSize(buf);
    if (typeof r.width !== "number" || typeof r.height !== "number") return null;
    if (!Number.isFinite(r.width) || !Number.isFinite(r.height)) return null;
    const width = Math.round(r.width);
    const height = Math.round(r.height);
    if (width < 1 || height < 1 || width > 65535 || height > 65535) return null;
    return { width, height };
  } catch {
    return null;
  }
}
