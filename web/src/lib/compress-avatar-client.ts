import { MAX_AVATAR_BYTES } from "@/lib/upload-limits";

const MAX_EDGE_PX = 512;
const MIN_EDGE_PX = 64;
const MIN_QUALITY = 0.34;

function canvasSupportsWebp(canvas: HTMLCanvasElement): boolean {
  const u = canvas.toDataURL("image/webp", 0.01);
  return u.startsWith("data:image/webp");
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

function scaleDimensions(
  w: number,
  h: number,
  maxEdge: number
): { w: number; h: number } {
  const m = Math.max(w, h);
  if (m <= maxEdge) return { w, h };
  const s = maxEdge / m;
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

async function tryEncodeBelowLimit(
  canvas: HTMLCanvasElement
): Promise<File | null> {
  const mimeOrder: readonly ("image/webp" | "image/jpeg")[] = canvasSupportsWebp(
    canvas
  )
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];

  for (const mime of mimeOrder) {
    if (mime === "image/webp" && !canvasSupportsWebp(canvas)) continue;
    for (let q = 0.9; q >= MIN_QUALITY - 1e-6; q -= 0.06) {
      const blob = await canvasToBlob(canvas, mime, q);
      if (blob && blob.size > 0 && blob.size <= MAX_AVATAR_BYTES) {
        const name = mime === "image/webp" ? "avatar.webp" : "avatar.jpg";
        return new File([blob], name, { type: mime });
      }
    }
  }
  return null;
}

/**
 * 浏览器端将头像压到 ≤ MAX_AVATAR_BYTES 再上传；已足够小则原样返回。
 */
export async function compressAvatarForUpload(file: File): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("compressAvatarForUpload must run in the browser");
  }
  if (file.size <= MAX_AVATAR_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Could not read this image. Try PNG, JPEG, WebP, or GIF."
    );
  }

  try {
    let maxEdge = MAX_EDGE_PX;
    while (maxEdge >= MIN_EDGE_PX) {
      const { w, h } = scaleDimensions(bitmap.width, bitmap.height, maxEdge);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not create canvas context");
      }
      ctx.drawImage(bitmap, 0, 0, w, h);

      const out = await tryEncodeBelowLimit(canvas);
      if (out) return out;

      maxEdge = Math.floor(maxEdge * 0.85);
    }

    throw new Error(
      `Image is still too large after compression (${MAX_AVATAR_BYTES} bytes max). Try a simpler image.`
    );
  } finally {
    bitmap.close();
  }
}
