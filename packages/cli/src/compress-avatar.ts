import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MAX_AVATAR_BYTES } from "./upload-limits.js";

const MAX_EDGE = 512;
const MIN_EDGE = 64;

export type PreparedAvatar = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

/**
 * 本机将头像压到 ≤ MAX_AVATAR_BYTES；已足够小则原样返回。
 */
export async function prepareAvatarForPublish(
  filePath: string
): Promise<PreparedAvatar> {
  const buf = await fs.readFile(filePath);
  const filename = path.basename(filePath);
  if (buf.length <= MAX_AVATAR_BYTES) {
    return {
      buffer: buf,
      filename,
      contentType: "application/octet-stream",
    };
  }

  let edge = MAX_EDGE;
  while (edge >= MIN_EDGE) {
    for (let q = 92; q >= 35; q -= 7) {
      const out = await sharp(buf, { failOn: "none" })
        .rotate()
        .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: q, mozjpeg: true })
        .toBuffer();
      if (out.length <= MAX_AVATAR_BYTES) {
        const stem = path.basename(filePath, path.extname(filePath)) || "avatar";
        return {
          buffer: out,
          filename: `${stem}.jpg`,
          contentType: "image/jpeg",
        };
      }
    }
    edge = Math.floor(edge * 0.85);
  }

  throw new Error(
    `头像在本地压缩后仍超过 ${MAX_AVATAR_BYTES} 字节（512 KiB），请换一张更简单的图或手动缩小后再试。`
  );
}
