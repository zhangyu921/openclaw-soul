import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const tsxBin = join(cliRoot, "node_modules", ".bin", "tsx");

/** Isolated HOME for tests — never touches the real user profile. */
export function isolatedHome(): string {
  return mkdtempSync(join(tmpdir(), "ocs-cli-test-"));
}

export function removeDir(p: string): void {
  rmSync(p, { recursive: true, force: true });
}

/**
 * Run the CLI entry with optional env (e.g. HOME, OPENCLAW_CONFIG).
 * Invokes local `node_modules/.bin/tsx` (no `pnpm exec` — faster, fewer hangs in CI).
 */
function envWithoutProxy(): NodeJS.ProcessEnv {
  const e = { ...process.env };
  for (const k of [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "ALL_PROXY",
    "all_proxy",
  ]) {
    delete e[k];
  }
  /** 避免 undici 把 127.0.0.1 走代理导致 fetch 超时 */
  e.NO_PROXY = "*";
  return e;
}

export function runOcs(
  args: string[],
  env: NodeJS.ProcessEnv = {}
): { status: number | null; stdout: string; stderr: string } {
  const merged = { ...envWithoutProxy(), ...env };
  /** 降低 undici 重试次数，避免集成测试里偶发长等待 */
  if (merged.OPENCLAW_SOUL_FETCH_MAX_RETRIES === undefined) {
    merged.OPENCLAW_SOUL_FETCH_MAX_RETRIES = "0";
  }
  /**
   * cwd 不能是 monorepo 子目录：否则子进程里 loadCliEnv() 会加载仓库根目录 `.env.cli`
   * 并覆盖代理相关变量，导致对 127.0.0.1 的 fetch 走代理、超时。
   */
  const cwd = mkdtempSync(join(tmpdir(), "ocs-cwd-"));
  const entry = join(cliRoot, "src/index.ts");
  const result = spawnSync(tsxBin, [entry, ...args], {
    cwd,
    encoding: "utf-8",
    env: merged,
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    rmSync(cwd, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

