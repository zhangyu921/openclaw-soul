/**
 * Ingest uploaded zip into `PackMarkdownFile` + `PackBinaryFile` (pack source of truth).
 * Blob writes are not transactional with Prisma; order: upload binary → upsert row → delete old blob ref.
 */
import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
import * as yauzl from "yauzl";
import type { Entry } from "yauzl";
import type { PrismaClient } from "@/generated/prisma/client";
import { isMarkdownPath, normalizeZipEntryPath } from "@/lib/pack-paths";
import { removeStoredFileIfExists, writeBinaryForPack } from "@/lib/storage";
import { MAX_PACK_ZIP_BYTES, zipTooLargeMessage } from "@/lib/upload-limits";

/** Zip entry path after normalization; skips dirs, `__MACOSX`, `.DS_Store`. */
export function filterPackZipEntryPath(fileName: string): string | null {
  if (/\/$/.test(fileName)) return null;
  const p = normalizeZipEntryPath(fileName);
  if (!p) return null;
  if (p.startsWith("__MACOSX/")) return null;
  if (p === ".DS_Store" || p.endsWith("/.DS_Store")) return null;
  return p;
}

function decodeUtf8StrictMarkdown(buf: Buffer): string {
  const dec = new TextDecoder("utf-8", { fatal: true });
  return dec.decode(buf);
}

/**
 * Read all file entries from zip into a path → buffer map (last entry wins on duplicate paths).
 */
export function readZipFilesAsMap(zipBuf: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      zipBuf,
      { lazyEntries: true, validateEntrySizes: true },
      (err, zipfile) => {
        if (err || !zipfile) {
          reject(err ?? new Error("invalid zip"));
          return;
        }

        const map = new Map<string, Buffer>();

        zipfile.on("error", reject);

        zipfile.on("entry", (entry: Entry) => {
          const p = filterPackZipEntryPath(entry.fileName);
          if (!p) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (streamErr, rs) => {
            if (streamErr || !rs) {
              zipfile.readEntry();
              if (streamErr) reject(streamErr);
              return;
            }
            const chunks: Buffer[] = [];
            rs.on("data", (c: Buffer) => chunks.push(c));
            rs.on("end", () => {
              map.set(p, Buffer.concat(chunks));
              zipfile.readEntry();
            });
            rs.on("error", reject);
          });
        });

        zipfile.on("end", () => {
          zipfile.close();
          resolve(map);
        });

        zipfile.readEntry();
      }
    );
  });
}

/**
 * Parse zip and persist all `.md` rows + non-md binaries for `packId`.
 */
export async function ingestZipToPackSource(
  db: PrismaClient,
  packId: string,
  zipBuf: Buffer
): Promise<void> {
  if (zipBuf.length > MAX_PACK_ZIP_BYTES) {
    throw new Error(zipTooLargeMessage());
  }

  const files = await readZipFilesAsMap(zipBuf);
  const newPaths = new Set(files.keys());

  const existingMd = await db.packMarkdownFile.findMany({
    where: { packId },
    select: { path: true },
  });
  const existingBin = await db.packBinaryFile.findMany({
    where: { packId },
    select: { path: true, storageRef: true },
  });

  for (const md of existingMd) {
    if (!newPaths.has(md.path)) {
      await db.packMarkdownFile.delete({
        where: { packId_path: { packId, path: md.path } },
      });
    }
  }
  for (const bin of existingBin) {
    if (!newPaths.has(bin.path)) {
      await db.packBinaryFile.delete({
        where: { packId_path: { packId, path: bin.path } },
      });
      await removeStoredFileIfExists(bin.storageRef);
    }
  }

  for (const [path, buf] of files) {
    if (isMarkdownPath(path)) {
      await db.packBinaryFile.deleteMany({ where: { packId, path } });
      let content: string;
      try {
        content = decodeUtf8StrictMarkdown(buf);
      } catch {
        throw new Error(`invalid UTF-8 in markdown entry: ${path}`);
      }
      await db.packMarkdownFile.upsert({
        where: { packId_path: { packId, path } },
        create: { packId, path, content },
        update: { content },
      });
    } else {
      await db.packMarkdownFile.deleteMany({ where: { packId, path } });
      const prev = await db.packBinaryFile.findUnique({
        where: { packId_path: { packId, path } },
      });
      const storageRef = await writeBinaryForPack(packId, path, buf);
      const sha256 = createHash("sha256").update(buf).digest("hex");
      await db.packBinaryFile.upsert({
        where: { packId_path: { packId, path } },
        create: {
          packId,
          path,
          storageRef,
          byteSize: buf.length,
          sha256,
        },
        update: {
          storageRef,
          byteSize: buf.length,
          sha256,
        },
      });
      if (prev?.storageRef && prev.storageRef !== storageRef) {
        await removeStoredFileIfExists(prev.storageRef);
      }
    }
  }
}
