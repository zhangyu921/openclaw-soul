import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

/** Walk up from `start` to find the `openclaw-soul` monorepo root (for `.env.cli` and path resolution). */
export function findMonorepoRoot(start: string = process.cwd()): string | null {
  let dir = path.resolve(start);
  for (let i = 0; i < 40; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const raw = fs.readFileSync(pkg, "utf8");
        const j = JSON.parse(raw) as { name?: string };
        if (j.name === "openclaw-soul") return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Resolve a user-supplied path: try cwd first, then monorepo root (so `npm run ocs` from root
 * with `-w` still finds `./example-pack`).
 */
export function resolveWorkspacePath(userPath: string): string {
  const normalized = userPath.trim();
  const fromCwd = path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(process.cwd(), normalized);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const root = findMonorepoRoot();
  if (root && !path.isAbsolute(normalized)) {
    const fromRoot = path.resolve(root, normalized);
    if (fs.existsSync(fromRoot)) return fromRoot;
  }
  return fromCwd;
}

/** Load OPENCLAW_* from repo-root `.env.cli` (before Commander reads default option values). */
export function loadCliEnv(): void {
  const root = findMonorepoRoot(process.cwd());
  if (!root) return;
  const envPath = path.join(root, ".env.cli");
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
}
