import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";

/** OpenClaw workspace root files only — no path traversal, no memory/ subtree in v1 import. */
export const WORKSPACE_ROOT_FILE_ALLOWLIST = new Set([
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "MEMORY.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "BOOT.md",
  "BOOTSTRAP.md",
  "AGENTS.md",
]);

type ManifestFile = { src: string; dest: string };

type Manifest = {
  schemaVersion?: number;
  files: ManifestFile[];
};

export function importFromManifest(
  packDir: string,
  targetDir: string,
  dryRun: boolean
): void {
  const manifestPath = path.join(packDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${packDir}`);
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  const m = JSON5.parse(raw) as Manifest;
  if (!Array.isArray(m.files) || m.files.length === 0) {
    throw new Error("manifest.files must be a non-empty array");
  }

  for (const f of m.files) {
    if (!f.src || !f.dest) throw new Error("each file entry needs src and dest");
    if (f.dest !== path.basename(f.dest)) {
      throw new Error(`dest must be a single filename, got: ${f.dest}`);
    }
    if (f.dest.includes("..") || f.src.includes("..")) {
      throw new Error("paths must not contain '..'");
    }
    if (!WORKSPACE_ROOT_FILE_ALLOWLIST.has(f.dest)) {
      throw new Error(
        `dest not allowed: ${f.dest} (allowed: ${[...WORKSPACE_ROOT_FILE_ALLOWLIST].join(", ")})`
      );
    }
    const srcFull = path.resolve(packDir, f.src);
    if (!srcFull.startsWith(path.resolve(packDir))) {
      throw new Error(`src escapes pack dir: ${f.src}`);
    }
    if (!fs.existsSync(srcFull) || !fs.statSync(srcFull).isFile()) {
      throw new Error(`missing or not a file: ${f.src}`);
    }
    const targetFull = path.join(path.resolve(targetDir), f.dest);
    if (dryRun) {
      console.error(`[dry-run] ${srcFull} -> ${targetFull}`);
      continue;
    }
    fs.mkdirSync(path.resolve(targetDir), { recursive: true });
    fs.copyFileSync(srcFull, targetFull);
    console.error(`Copied ${f.dest}`);
  }
}
