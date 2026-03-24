import fs from "node:fs/promises";
import path from "node:path";

export function storageRoot(): string {
  const root =
    process.env.STORAGE_PATH ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "storage");
  return root;
}

function useVercelBlob(): boolean {
  return (
    process.env.STORAGE_DRIVER === "vercel-blob" ||
    Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
  );
}

/**
 * Vercel 新建 Blob 存储多为 **private**；与 `put({ access: "public" })` 不兼容。
 * 设为 `private` 时上传与读取均走 SDK（`get`），不依赖匿名 URL。
 */
function blobAccess(): "public" | "private" {
  const v = process.env.BLOB_ACCESS?.trim().toLowerCase();
  return v === "private" ? "private" : "public";
}

async function readableStreamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/** DB 里存相对路径，或 Vercel Blob 的完整 https URL。 */
export function isRemoteStored(ref: string): boolean {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

export async function ensurePackDirs(): Promise<void> {
  if (useVercelBlob()) return;
  const root = /* turbopackIgnore: true */ storageRoot();
  await fs.mkdir(path.join(root, "packs"), { recursive: true });
  await fs.mkdir(path.join(root, "avatars"), { recursive: true });
}

export function zipPathForPack(packId: string): string {
  return path.join(/* turbopackIgnore: true */ storageRoot(), "packs", `${packId}.zip`);
}

export function avatarPathForPack(packId: string, ext: string): string {
  return path.join(
    /* turbopackIgnore: true */ storageRoot(),
    "avatars",
    `${packId}${ext}`
  );
}

export async function readStoredFile(ref: string): Promise<Buffer> {
  if (isRemoteStored(ref)) {
    if (useVercelBlob() && blobAccess() === "private") {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token?.trim()) {
        throw new Error("BLOB_READ_WRITE_TOKEN required for private blob reads");
      }
      const { get } = await import("@vercel/blob");
      const result = await get(ref, {
        access: "private",
        token,
      });
      if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error(`blob get failed (${ref})`);
      }
      return readableStreamToBuffer(result.stream);
    }
    const res = await fetch(ref);
    if (!res.ok) {
      throw new Error(`blob fetch ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  const abs = path.join(
    /* turbopackIgnore: true */ storageRoot(),
    ref
  );
  return fs.readFile(abs);
}

export async function writeZipForPack(
  packId: string,
  buf: Buffer
): Promise<string> {
  const rel = `packs/${packId}.zip`;
  if (useVercelBlob()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(rel, buf, {
      access: blobAccess(),
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return url;
  }
  await ensurePackDirs();
  const abs = zipPathForPack(packId);
  await fs.writeFile(abs, buf);
  return rel;
}

export async function writeAvatarForPack(
  packId: string,
  ext: string,
  buf: Buffer
): Promise<string> {
  const rel = `avatars/${packId}${ext}`;
  if (useVercelBlob()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(rel, buf, {
      access: blobAccess(),
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return url;
  }
  await ensurePackDirs();
  const abs = avatarPathForPack(packId, ext);
  await fs.writeFile(abs, buf);
  return rel;
}

export async function removeStoredFile(ref: string | null): Promise<void> {
  if (!ref) return;
  if (isRemoteStored(ref)) {
    const { del } = await import("@vercel/blob");
    await del(ref, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  const abs = path.join(
    /* turbopackIgnore: true */ storageRoot(),
    ref
  );
  await fs.unlink(abs).catch(() => {});
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new Error("Invalid slug");
  }
}

/** Public username in URLs; same character rules as pack slug. */
export function assertValidHandle(handle: string): void {
  assertValidSlug(handle);
}
