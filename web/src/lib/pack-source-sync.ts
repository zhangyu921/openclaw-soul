/**
 * After `PackMarkdownFile` / `PackBinaryFile` rows change, refresh denormalized path list.
 * Does **not** write a new zip to storage; invalidates any cached zip (`zipRelPath` cleared, blob removed).
 * Zip is built lazily on download / `apply` via `buildAndStoreZipFromPackDb`.
 */
import { PackVisibility } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { HOME_LISTING_PACKS_TAG } from "@/lib/cache-tags";
import { revalidateDataTag } from "@/lib/revalidate-data";
import { removeStoredFileIfExists } from "@/lib/storage";
import { extractPackFilePathsFromDb } from "@/lib/zip-pack-preview";

export async function syncPackDerivedAfterSourceChange(
  db: PrismaClient,
  packId: string
): Promise<void> {
  const preview = await extractPackFilePathsFromDb(db, packId);
  const row = await db.pack.findUnique({
    where: { id: packId },
    select: { visibility: true, zipRelPath: true },
  });
  await removeStoredFileIfExists(row?.zipRelPath ?? null);

  const empty = preview.packFilePaths.length === 0;
  const mustUnlist =
    empty && row?.visibility === PackVisibility.LISTED;
  await db.pack.update({
    where: { id: packId },
    data: {
      packFilePaths: preview.packFilePaths,
      zipRelPath: null,
      ...(mustUnlist ? { visibility: PackVisibility.UNLISTED } : {}),
    },
  });

  if (mustUnlist) {
    revalidateDataTag(HOME_LISTING_PACKS_TAG);
  }
}
