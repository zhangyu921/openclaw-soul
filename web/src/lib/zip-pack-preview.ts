/**
 * Publish-time extraction from workspace zip: SOUL.md body + sorted file path list.
 * Future: optional GET /api/packs/.../preview/file (or similar) to stream other entries
 * from the stored zip with a path whitelist — works alongside these denormalized fields.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import type { Entry } from "yauzl";
import * as yauzl from "yauzl";

const MAX_SOUL_BYTES = 256 * 1024;
const MAX_LISTED_PATHS = 300;

export type PackZipPreview = {
  soulPreviewMd: string | null;
  soulPreviewTruncated: boolean;
  packFilePaths: string[];
};

const EMPTY: PackZipPreview = {
  soulPreviewMd: null,
  soulPreviewTruncated: false,
  packFilePaths: [],
};

function normalizeZipPath(fileName: string): string | null {
  if (/\/$/.test(fileName)) return null;
  const p = fileName.replace(/^\/+/, "");
  if (!p) return null;
  const segments = p.split("/");
  if (segments.some((s) => s === "..")) return null;
  if (p.startsWith("__MACOSX/")) return null;
  if (p === ".DS_Store" || p.endsWith("/.DS_Store")) return null;
  return p;
}

function pickSoulEntry(candidates: { path: string; entry: Entry }[]): Entry | null {
  if (candidates.length === 0) return null;
  const root = candidates.find((c) => c.path === "SOUL.md");
  if (root) return root.entry;
  return [...candidates].sort(
    (a, b) => a.path.length - b.path.length || a.path.localeCompare(b.path)
  )[0]!.entry;
}

export function parsePackFilePaths(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Preview fields when `Pack.artifactSource === DB` (md/binary rows are source of truth). */
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

export function extractPackPreviewFromZip(zipBuf: Buffer): Promise<PackZipPreview> {
  return new Promise((resolve) => {
    yauzl.fromBuffer(
      zipBuf,
      { lazyEntries: true, validateEntrySizes: true },
      (err, zipfile) => {
        if (err || !zipfile) {
          if (err) console.error("extractPackPreviewFromZip: fromBuffer", err);
          resolve(EMPTY);
          return;
        }

        let settled = false;
        const pathsSet = new Set<string>();
        const soulCandidates: { path: string; entry: Entry }[] = [];

        const finish = (r: PackZipPreview) => {
          if (settled) return;
          settled = true;
          zipfile.close();
          resolve(r);
        };

        zipfile.on("error", (e) => {
          console.error("extractPackPreviewFromZip: zipfile error", e);
          finish(EMPTY);
        });

        zipfile.on("entry", (entry: Entry) => {
          const p = normalizeZipPath(entry.fileName);
          if (p) {
            if (pathsSet.size < MAX_LISTED_PATHS) pathsSet.add(p);
            if (p === "SOUL.md" || p.endsWith("/SOUL.md")) {
              soulCandidates.push({ path: p, entry });
            }
          }
          zipfile.readEntry();
        });

        zipfile.on("end", () => {
          const paths = [...pathsSet].sort((a, b) => a.localeCompare(b));
          const soulEntry = pickSoulEntry(soulCandidates);
          if (!soulEntry) {
            finish({
              soulPreviewMd: null,
              soulPreviewTruncated: false,
              packFilePaths: paths,
            });
            return;
          }

          zipfile.openReadStream(soulEntry, (streamErr, rs) => {
            if (streamErr || !rs) {
              if (streamErr) console.error("extractPackPreviewFromZip: openReadStream", streamErr);
              finish({
                soulPreviewMd: null,
                soulPreviewTruncated: false,
                packFilePaths: paths,
              });
              return;
            }

            const chunks: Buffer[] = [];
            let received = 0;
            let truncated = false;

            rs.on("data", (chunk: Buffer) => {
              if (truncated) return;
              if (received + chunk.length <= MAX_SOUL_BYTES) {
                chunks.push(chunk);
                received += chunk.length;
              } else {
                const take = MAX_SOUL_BYTES - received;
                if (take > 0) chunks.push(chunk.subarray(0, take));
                truncated = true;
                received = MAX_SOUL_BYTES;
                rs.destroy();
              }
            });

            rs.on("end", () => {
              const buf = Buffer.concat(chunks);
              const text = buf.length ? buf.toString("utf8") : null;
              finish({
                soulPreviewMd: text,
                soulPreviewTruncated: truncated,
                packFilePaths: paths,
              });
            });

            rs.on("error", (e) => {
              console.error("extractPackPreviewFromZip: read stream", e);
              finish({
                soulPreviewMd: null,
                soulPreviewTruncated: false,
                packFilePaths: paths,
              });
            });
          });
        });

        zipfile.readEntry();
      }
    );
  });
}
