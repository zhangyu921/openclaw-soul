/**
 * Build a pack zip from `PackMarkdownFile` + `PackBinaryFile` rows (artifactSource === DB).
 */
import yazl from "yazl";
import type { PrismaClient } from "@/generated/prisma/client";
import { readStoredFile, writeZipForPack } from "@/lib/storage";
import { MAX_PACK_ZIP_BYTES, zipTooLargeMessage } from "@/lib/upload-limits";

function zipFileToBuffer(zip: yazl.ZipFile): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zip.outputStream.on("data", (c: Buffer) => chunks.push(c));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.end();
  });
}

/**
 * Assemble zip bytes from DB rows; enforces 2 MiB limit on uncompressed sum and on output size.
 */
export async function buildZipBufferFromPackDb(
  db: PrismaClient,
  packId: string
): Promise<Buffer> {
  const mds = await db.packMarkdownFile.findMany({
    where: { packId },
    orderBy: { path: "asc" },
  });
  const bins = await db.packBinaryFile.findMany({
    where: { packId },
    orderBy: { path: "asc" },
  });

  const mdByPath = new Map(mds.map((m) => [m.path, m] as const));
  const binByPath = new Map(bins.map((b) => [b.path, b] as const));
  const paths = [...new Set([...mdByPath.keys(), ...binByPath.keys()])].sort(
    (a, b) => a.localeCompare(b)
  );

  let uncompressed = 0;
  const zip = new yazl.ZipFile();

  for (const path of paths) {
    const md = mdByPath.get(path);
    const bin = binByPath.get(path);
    if (md && bin) {
      throw new Error(`pack ${packId}: path in both md and binary: ${path}`);
    }
    if (md) {
      const buf = Buffer.from(md.content, "utf8");
      uncompressed += buf.length;
      zip.addBuffer(buf, path);
      continue;
    }
    if (bin) {
      let buf: Buffer;
      try {
        buf = await readStoredFile(bin.storageRef);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`binary read failed for ${path}: ${msg}`);
      }
      uncompressed += buf.length;
      zip.addBuffer(buf, path);
    }
  }

  if (uncompressed > MAX_PACK_ZIP_BYTES) {
    throw new Error(zipTooLargeMessage());
  }

  const out = await zipFileToBuffer(zip);
  if (out.length > MAX_PACK_ZIP_BYTES) {
    throw new Error(zipTooLargeMessage());
  }
  return out;
}

/** Build zip from DB and write to storage; updates `Pack.zipRelPath`. */
export async function buildAndStoreZipFromPackDb(
  db: PrismaClient,
  packId: string
): Promise<{ zipBuf: Buffer; zipRelPath: string }> {
  const zipBuf = await buildZipBufferFromPackDb(db, packId);
  const zipRelPath = await writeZipForPack(packId, zipBuf);
  await db.pack.update({
    where: { id: packId },
    data: { zipRelPath },
  });
  return { zipBuf, zipRelPath };
}
