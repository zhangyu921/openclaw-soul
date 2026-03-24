import { Agent, fetch as undiciFetch } from "undici";

function parseMs(env: string | undefined, fallback: number): number {
  const n = env?.trim() ? Number.parseInt(env.trim(), 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_CONNECT_MS = 60_000;
const DEFAULT_HEADERS_MS = 60_000;
const DEFAULT_BODY_MS = 300_000;

let agent: Agent | undefined;

function getAgent(): Agent {
  if (!agent) {
    agent = new Agent({
      connectTimeout: parseMs(
        process.env.OPENCLAW_SOUL_CONNECT_TIMEOUT_MS,
        DEFAULT_CONNECT_MS
      ),
      headersTimeout: parseMs(
        process.env.OPENCLAW_SOUL_HEADERS_TIMEOUT_MS,
        DEFAULT_HEADERS_MS
      ),
      bodyTimeout: parseMs(
        process.env.OPENCLAW_SOUL_BODY_TIMEOUT_MS,
        DEFAULT_BODY_MS
      ),
    });
  }
  return agent;
}

export function isConnectTimeoutError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { cause?: unknown; code?: string };
  if (err.code === "UND_ERR_CONNECT_TIMEOUT") return true;
  const c = err.cause;
  if (c && typeof c === "object" && "code" in c) {
    return (c as { code?: string }).code === "UND_ERR_CONNECT_TIMEOUT";
  }
  return false;
}

/** Registry / CDN requests with tunable timeouts（默认长于 Node fetch 的 ~10s 连接超时） */
export async function fetchRegistry(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await undiciFetch(input, {
    ...init,
    dispatcher: getAgent(),
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}
