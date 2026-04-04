/**
 * After `PackMarkdownFile` / `PackBinaryFile` rows change, refresh denormalized path list + zip.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { extractPackFilePathsFromDb } from "@/lib/zip-pack-preview";

export async function syncPackDerivedAfterSourceChange(
  db: PrismaClient,
  packId: string
): Promise<void> {
  const preview = await extractPackFilePathsFromDb(db, packId);
  await buildAndStoreZipFromPackDb(db, packId);
  await db.pack.update({
    where: { id: packId },
    data: {
      packFilePaths: preview.packFilePaths,
    },
  });
}
