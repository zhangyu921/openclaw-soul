import fs from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";
import yazl from "yazl";
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

async function walkFilesRecursive(absDir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.promises.readdir(absDir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(absDir, e.name);
    if (e.isDirectory()) {
      results.push(...(await walkFilesRecursive(abs)));
    } else if (e.isFile()) {
      results.push(abs);
    }
  }
  return results;
}

function zipEntryPathForZip(rootResolved: string, absFile: string): string {
  let meta = path.relative(rootResolved, absFile);
  if (meta.startsWith("..")) {
    throw new Error(`Path escapes zip root: ${absFile}`);
  }
  return meta.split(path.sep).join("/");
}

function finalizeZipToPath(zipfile: yazl.ZipFile, outZipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outZipPath);
    output.on("close", () => resolve());
    output.on("error", reject);
    zipfile.outputStream.on("error", reject);
    zipfile.outputStream.pipe(output);
    zipfile.end();
  });
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
  const zipfile = new yazl.ZipFile();
  for (const n of unique) {
    zipfile.addFile(path.join(sourceDir, n), n.split(path.sep).join("/"), {
      compress: true,
      compressionLevel: 9,
    });
  }
  await finalizeZipToPath(zipfile, outZipPath);
}

export async function zipDirectory(
  sourceDir: string,
  outZipPath: string
): Promise<void> {
  const root = path.resolve(sourceDir);
  const files = await walkFilesRecursive(root);
  if (files.length === 0) {
    throw new Error("No files to zip under directory");
  }

  await fs.promises.mkdir(path.dirname(outZipPath), { recursive: true });
  const zipfile = new yazl.ZipFile();
  for (const abs of files) {
    const meta = zipEntryPathForZip(root, abs);
    zipfile.addFile(abs, meta, {
      compress: true,
      compressionLevel: 9,
    });
  }
  await finalizeZipToPath(zipfile, outZipPath);
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
