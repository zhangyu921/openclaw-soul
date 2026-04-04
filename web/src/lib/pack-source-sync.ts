/**
 * After `PackMarkdownFile` / `PackBinaryFile` rows change, refresh denormalized preview + zip.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { extractPackPreviewFromDb } from "@/lib/zip-pack-preview";

export async function syncPackDerivedAfterSourceChange(
  db: PrismaClient,
  packId: string
): Promise<void> {
  const preview = await extractPackPreviewFromDb(db, packId);
  await buildAndStoreZipFromPackDb(db, packId);
  await db.pack.update({
    where: { id: packId },
    data: {
      soulPreviewMd: preview.soulPreviewMd,
      soulPreviewTruncated: preview.soulPreviewTruncated,
      packFilePaths: preview.packFilePaths,
    },
  });
}
