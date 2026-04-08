/**
 * After `PackMarkdownFile` / `PackBinaryFile` rows change, refresh denormalized path list + zip.
 */
import { PackVisibility } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { extractPackFilePathsFromDb } from "@/lib/zip-pack-preview";

export async function syncPackDerivedAfterSourceChange(
  db: PrismaClient,
  packId: string
): Promise<void> {
  const preview = await extractPackFilePathsFromDb(db, packId);
  await buildAndStoreZipFromPackDb(db, packId);
  const row = await db.pack.findUnique({
    where: { id: packId },
    select: { visibility: true },
  });
  const empty = preview.packFilePaths.length === 0;
  const mustUnlist =
    empty && row?.visibility === PackVisibility.LISTED;
  await db.pack.update({
    where: { id: packId },
    data: {
      packFilePaths: preview.packFilePaths,
      ...(mustUnlist ? { visibility: PackVisibility.UNLISTED } : {}),
    },
  });
}
