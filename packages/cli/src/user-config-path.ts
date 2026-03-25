import os from "node:os";
import path from "node:path";

/**
 * Directory for production CLI credentials (token, default API base).
 * Override with OPENCLAW_SOUL_CONFIG_DIR (absolute or relative to cwd).
 */
export function getOpenclawSoulConfigDir(): string {
  const override = process.env.OPENCLAW_SOUL_CONFIG_DIR?.trim();
  if (override) return path.resolve(override);
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "openclaw-soul");
  }
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  const base =
    xdg && path.isAbsolute(xdg)
      ? xdg
      : path.join(os.homedir(), ".config");
  return path.join(base, "openclaw-soul");
}

/** Dotenv-style file path for OPENCLAW_SOUL_* (production default). */
export function getUserEnvFilePath(): string {
  return path.join(getOpenclawSoulConfigDir(), "env");
}
