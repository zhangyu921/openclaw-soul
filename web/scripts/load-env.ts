/**
 * Must be imported before any module that reads `process.env` (e.g. `@/lib/prisma`).
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(dir, "../.env") });
loadEnv({ path: path.join(dir, "../.env.local") });
