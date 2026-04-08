import { randomUUID } from "node:crypto";
import { PackVisibility } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { ingestZipToPackSource } from "@/lib/pack-source-ingest";
import { syncPackDerivedAfterSourceChange } from "@/lib/pack-source-sync";
import { buildEmptyZipBuffer } from "@/lib/pack-source-zip";
import {
  assertValidSlug,
  ensurePackDirs,
  removeStoredFile,
  writeZipForPack,
} from "@/lib/storage";

export type CreateEmptyPackResult =
  | { ok: true; handle: string; slug: string; viewPath: string }
  | { ok: false; error: "no_handle" | "invalid_slug" | "slug_taken" };

/**
 * Session-only: create an empty UNLISTED pack (no md/bin rows after ingest).
 */
export async function createEmptyPackForUserId(
  db: PrismaClient,
  userId: string,
  slugRaw: string
): Promise<CreateEmptyPackResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { handle: true },
  });
  const handle = user?.handle?.trim() ?? "";
  if (!handle) {
    return { ok: false, error: "no_handle" };
  }

  const slug = slugRaw.trim();
  if (!slug) {
    return { ok: false, error: "invalid_slug" };
  }
  try {
    assertValidSlug(slug);
  } catch {
    return { ok: false, error: "invalid_slug" };
  }

  await ensurePackDirs();
  const id = randomUUID();
  const zipBuf = await buildEmptyZipBuffer();
  const zipRelPath = await writeZipForPack(id, zipBuf);

  try {
    await db.pack.create({
      data: {
        id,
        slug,
        title: slug,
        summary: null,
        zipRelPath,
        avatarRelPath: null,
        packFilePaths: [],
        authorId: userId,
        visibility: PackVisibility.UNLISTED,
      },
    });
  } catch (e) {
    await removeStoredFile(zipRelPath).catch(() => {});
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, error: "slug_taken" };
    }
    throw e;
  }

  try {
    await ingestZipToPackSource(db, id, zipBuf);
    await syncPackDerivedAfterSourceChange(db, id);
  } catch (e) {
    console.error(e);
    try {
      await db.pack.delete({ where: { id } });
    } catch (delErr) {
      console.error(delErr);
    }
    await removeStoredFile(zipRelPath).catch(() => {});
    throw e;
  }

  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  return {
    ok: true,
    handle,
    slug,
    viewPath: `/packs/${encH}/${encS}`,
  };
}
