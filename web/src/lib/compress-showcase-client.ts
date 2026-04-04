import { MAX_SHOWCASE_IMAGE_BYTES } from "@/lib/upload-limits";

/** 长边超过此像素才缩小（保持比例）。 */
const MAX_EDGE_PX = 4096;
const MIN_EDGE_PX = 256;
const MIN_QUALITY = 0.42;

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
  const mimeOrder: readonly ("image/webp" | "image/jpeg")[] = canvasSupportsWebp(canvas)
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];

  for (const mime of mimeOrder) {
    if (mime === "image/webp" && !canvasSupportsWebp(canvas)) continue;
    for (let q = 0.92; q >= MIN_QUALITY - 1e-6; q -= 0.05) {
      const blob = await canvasToBlob(canvas, mime, q);
      if (blob && blob.size > 0 && blob.size <= MAX_SHOWCASE_IMAGE_BYTES) {
        const name = mime === "image/webp" ? "showcase.webp" : "showcase.jpg";
        return new File([blob], name, { type: mime });
      }
    }
  }
  return null;
}

/**
 * 对话截图：≤2 MiB；原图在限制内则不改；否则按比例缩小长边（不超过 MAX_EDGE_PX）再压码。
 */
export async function compressShowcaseForUpload(file: File): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("compressShowcaseForUpload must run in the browser");
  }
  if (file.size <= MAX_SHOWCASE_IMAGE_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read this image. Try PNG, JPEG, WebP, or GIF.");
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

      maxEdge = Math.floor(maxEdge * 0.88);
    }

    throw new Error(
      `Image is still too large after compression (${MAX_SHOWCASE_IMAGE_BYTES} bytes max). Try a smaller screenshot.`
    );
  } finally {
    bitmap.close();
  }
}
