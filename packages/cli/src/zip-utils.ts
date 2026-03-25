import fs from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import extract from "extract-zip";
import { fetchRegistry, isConnectTimeoutError } from "./fetch-registry.js";

/** Single-segment workspace root filename; no traversal. */
export function assertSafeRootRelativeFile(
  sourceDir: string,
  name: string
): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Empty file name");
  }
  if (trimmed !== path.basename(trimmed)) {
    throw new Error(`Not a root file name: ${name}`);
  }
  if (trimmed.includes("..")) {
    throw new Error(`Invalid file name: ${name}`);
  }
  const abs = path.resolve(sourceDir, trimmed);
  const root = path.resolve(sourceDir);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace root: ${name}`);
  }
  return trimmed;
}

export async function zipSelectedFiles(
  sourceDir: string,
  rootFileNames: string[],
  outZipPath: string
): Promise<void> {
  const unique = [...new Set(rootFileNames.map((n) => assertSafeRootRelativeFile(sourceDir, n)))];
  if (unique.length === 0) {
    throw new Error("No files selected for zip");
  }
  const missing: string[] = [];
  for (const n of unique) {
    const abs = path.join(sourceDir, n);
    try {
      const st = await fs.promises.stat(abs);
      if (!st.isFile()) missing.push(n);
    } catch {
      missing.push(n);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing or not a file (workspace root): ${missing.join(", ")}`
    );
  }

  await fs.promises.mkdir(path.dirname(outZipPath), { recursive: true });
  const output = createWriteStream(outZipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const done = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", reject);
  });
  archive.pipe(output);
  for (const n of unique) {
    archive.file(path.join(sourceDir, n), { name: n });
  }
  await archive.finalize();
  await done;
}

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
