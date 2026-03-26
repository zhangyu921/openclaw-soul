import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
 * True when `importMetaUrl` points at the `@openclaw-soul/cli` install under
 * `monorepoRoot/node_modules/@openclaw-soul/cli` (after realpath). Used for tests and
 * `isWorkspaceInstalledCli`.
 */
export function isWorkspaceCliForRoot(
  monorepoRoot: string,
  importMetaUrl: string
): boolean {
  const entryFile = fileURLToPath(importMetaUrl);
  const cliPkgRoot = path.resolve(path.dirname(entryFile), "..");
  let cliReal: string;
  try {
    cliReal = fs.realpathSync(cliPkgRoot);
  } catch {
    return false;
  }
  const nmCli = path.join(monorepoRoot, "node_modules", "@openclaw-soul", "cli");
  let nmReal: string;
  try {
    nmReal = fs.realpathSync(nmCli);
  } catch {
    return false;
  }
  return cliReal === nmReal;
}

/**
 * True when this process is running the `@openclaw-soul/cli` package that the current cwd's
 * monorepo installs at `node_modules/@openclaw-soul/cli` (pnpm/npm workspace / local link).
 * False when running a copy from npx cache or another install — even if cwd is inside the repo.
 */
export function isWorkspaceInstalledCli(importMetaUrl: string): boolean {
  const root = findMonorepoRoot();
  if (!root) return false;
  return isWorkspaceCliForRoot(root, importMetaUrl);
}

/**
 * Registry base URL for CLI defaults when the user did not pass `--api` and has no
 * `OPENCLAW_SOUL_API` in the environment (after `loadCliEnv()`).
 */
export function resolveDefaultApiBase(importMetaUrl: string): string {
  const fromEnv = process.env.OPENCLAW_SOUL_API?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (isWorkspaceInstalledCli(importMetaUrl)) {
    return "http://localhost:3000";
  }
  return DEFAULT_OPENCLAW_SOUL_API;
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
