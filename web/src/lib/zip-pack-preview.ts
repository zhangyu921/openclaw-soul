/**
 * Publish-time preview fields from pack DB rows: SOUL.md body + sorted file path list.
 * Future: optional GET /api/packs/.../preview/file (or similar) to stream other entries
 * with a path whitelist — works alongside these denormalized fields.
 */
import type { PrismaClient } from "@/generated/prisma/client";

const MAX_SOUL_BYTES = 256 * 1024;
const MAX_LISTED_PATHS = 300;

export type PackZipPreview = {
  soulPreviewMd: string | null;
  soulPreviewTruncated: boolean;
  packFilePaths: string[];
};

export function parsePackFilePaths(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Preview fields from `PackMarkdownFile` / `PackBinaryFile` (source of truth). */
export async function extractPackPreviewFromDb(
  db: PrismaClient,
  packId: string
): Promise<PackZipPreview> {
  const mds = await db.packMarkdownFile.findMany({
    where: { packId },
    select: { path: true, content: true },
  });
  const bins = await db.packBinaryFile.findMany({
    where: { packId },
    select: { path: true },
  });
  const allPaths = [...mds.map((m) => m.path), ...bins.map((b) => b.path)].sort((a, b) =>
    a.localeCompare(b)
  );
  const packFilePaths = allPaths.slice(0, MAX_LISTED_PATHS);

  const soulCandidates = mds.filter(
    (m) => m.path === "SOUL.md" || m.path.endsWith("/SOUL.md")
  );
  if (soulCandidates.length === 0) {
    return {
      soulPreviewMd: null,
      soulPreviewTruncated: false,
      packFilePaths,
    };
  }
  const pick =
    soulCandidates.find((m) => m.path === "SOUL.md") ??
    [...soulCandidates].sort(
      (a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path)
    )[0]!;
  const body = pick.content;
  if (body.length <= MAX_SOUL_BYTES) {
    return { soulPreviewMd: body, soulPreviewTruncated: false, packFilePaths };
  }
  return {
    soulPreviewMd: body.slice(0, MAX_SOUL_BYTES),
    soulPreviewTruncated: true,
    packFilePaths,
  };
}
