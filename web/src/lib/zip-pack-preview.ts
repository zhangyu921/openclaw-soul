/**
 * Denormalized `packFilePaths` from `PackMarkdownFile` / `PackBinaryFile` (source of truth).
 */
import type { PrismaClient } from "@/generated/prisma/client";

const MAX_LISTED_PATHS = 300;

export type PackFilePathsFromDb = {
  packFilePaths: string[];
};

export function parsePackFilePaths(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Sorted path list (capped) from md/binary rows. */
export async function extractPackFilePathsFromDb(
  db: PrismaClient,
  packId: string
): Promise<PackFilePathsFromDb> {
  const mds = await db.packMarkdownFile.findMany({
    where: { packId },
    select: { path: true },
  });
  const bins = await db.packBinaryFile.findMany({
    where: { packId },
    select: { path: true },
  });
  const allPaths = [...mds.map((m) => m.path), ...bins.map((b) => b.path)].sort((a, b) =>
    a.localeCompare(b)
  );
  const packFilePaths = allPaths.slice(0, MAX_LISTED_PATHS);
  return { packFilePaths };
}
