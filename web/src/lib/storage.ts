import fs from "node:fs/promises";
import path from "node:path";

export function storageRoot(): string {
  const root = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");
  return root;
}

export async function ensurePackDirs(): Promise<void> {
  await fs.mkdir(path.join(storageRoot(), "packs"), { recursive: true });
  await fs.mkdir(path.join(storageRoot(), "avatars"), { recursive: true });
}

export function zipPathForPack(packId: string): string {
  return path.join(storageRoot(), "packs", `${packId}.zip`);
}

export function avatarPathForPack(packId: string, ext: string): string {
  return path.join(storageRoot(), "avatars", `${packId}${ext}`);
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
