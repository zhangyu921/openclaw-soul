import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { DEFAULT_OPENCLAW_SOUL_API } from "./constants.js";
import { getUserEnvFilePath } from "./user-config-path.js";

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
 * Registry base URL for CLI defaults when the user did not pass `--api` and has no
 * `OPENCLAW_SOUL_API` in the environment (after `loadCliEnv()`).
 */
export function resolveDefaultApiBase(): string {
  const fromEnv = process.env.OPENCLAW_SOUL_API?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return DEFAULT_OPENCLAW_SOUL_API;
}

/**
 * Resolve a user-supplied path: try cwd first, then monorepo root (so `pnpm run ocs` from repo root
 * with `-w` still finds a relative path like `./my-workspace`).
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

/**
 * Load OPENCLAW_* before Commander reads defaults:
 * 1. User config `env` (production) — does not override existing process.env (CI/shell).
 * 2. Monorepo `.env.cli` if present — overrides for local dev when cwd is inside the repo.
 */
export function loadCliEnv(): void {
  const userEnv = getUserEnvFilePath();
  if (fs.existsSync(userEnv)) {
    loadDotenv({ path: userEnv, override: false });
  }
  const root = findMonorepoRoot(process.cwd());
  if (root) {
    const repoCli = path.join(root, ".env.cli");
    if (fs.existsSync(repoCli)) {
      loadDotenv({ path: repoCli, override: true });
    }
  }
}
