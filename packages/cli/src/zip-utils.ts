import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import extract from "extract-zip";
import { fetchRegistry, isConnectTimeoutError } from "./fetch-registry.js";

export async function zipDirectory(
  sourceDir: string,
  outZipPath: string
): Promise<void> {
  await fs.promises.mkdir(path.dirname(outZipPath), { recursive: true });
  const output = createWriteStream(outZipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const done = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", reject);
  });
  archive.pipe(output);
  archive.directory(sourceDir, false);
  await archive.finalize();
  await done;
}

export async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await fs.promises.mkdir(destDir, { recursive: true });
  await extract(zipPath, { dir: destDir });
}

export async function downloadToFile(url: string, filePath: string): Promise<void> {
  let res: Response;
  try {
    res = await fetchRegistry(url);
  } catch (e) {
    if (isConnectTimeoutError(e)) {
      throw new Error(
        `下载超时（${url}）。可调大 OPENCLAW_SOUL_CONNECT_TIMEOUT_MS / OPENCLAW_SOUL_BODY_TIMEOUT_MS，或检查网络。`
      );
    }
    throw e;
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buf);
}
