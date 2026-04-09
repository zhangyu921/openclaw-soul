import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** OpenClaw Soul 全局 AGENTS：所有站内对话均注入；与作者上传的 `AGENTS.md`（USER-UPLOAD-AGENTS 段）的关系见该文件正文。 */
function resolveDefaultPackAgentsPath(): string {
  const fromCwd = join(process.cwd(), "src/lib/default-pack-agents.md");
  if (existsSync(fromCwd)) return fromCwd;
  const fromModule = join(dirname(fileURLToPath(import.meta.url)), "default-pack-agents.md");
  if (existsSync(fromModule)) return fromModule;
  throw new Error(
    `default-pack-agents.md not found (tried ${fromCwd} and ${fromModule})`
  );
}

export const DEFAULT_PACK_AGENTS_MD: string = readFileSync(
  resolveDefaultPackAgentsPath(),
  "utf-8"
).trimEnd();
