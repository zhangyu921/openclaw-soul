import { text } from "node:stream/consumers";
import {
  EnvHttpProxyAgent,
  RetryAgent,
  fetch as undiciFetch,
  request as undiciRequest,
} from "undici";

function parseMs(env: string | undefined, fallback: number): number {
  const n = env?.trim() ? Number.parseInt(env.trim(), 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseCount(env: string | undefined, fallback: number, max: number): number {
  const n = env?.trim() ? Number.parseInt(env.trim(), 10) : Number.NaN;
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, n);
}

const DEFAULT_CONNECT_MS = 60_000;
const DEFAULT_HEADERS_MS = 60_000;
const DEFAULT_BODY_MS = 300_000;
const DEFAULT_MAX_RETRIES = 3;

let dispatcher: RetryAgent | undefined;
/** 大体积 POST（publish）：不重试 5xx，避免 RetryAgent 抛 UND_ERR_REQ_RETRY 且看不到首包响应体。 */
let uploadDispatcher: EnvHttpProxyAgent | undefined;

function agentOpts() {
  return {
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
  };
}

function getDispatcher(): RetryAgent {
  if (!dispatcher) {
    const base = new EnvHttpProxyAgent(agentOpts());
    const maxRetries = parseCount(
      process.env.OPENCLAW_SOUL_FETCH_MAX_RETRIES,
      DEFAULT_MAX_RETRIES,
      8
    );
    dispatcher = new RetryAgent(base, {
      maxRetries,
      minTimeout: 750,
      timeoutFactor: 2,
      maxTimeout: 20_000,
      retryAfter: false,
      /** 含 POST：publish  multipart 在弱网下易出现 ECONNRESET */
      methods: [
        "GET",
        "HEAD",
        "OPTIONS",
        "PUT",
        "DELETE",
        "TRACE",
        "POST",
      ],
      errorCodes: [
        "ECONNRESET",
        "ECONNREFUSED",
        "ENOTFOUND",
        "ENETDOWN",
        "ENETUNREACH",
        "EHOSTDOWN",
        "EHOSTUNREACH",
        "EPIPE",
        "ETIMEDOUT",
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_SOCKET",
      ],
    });
  }
  return dispatcher;
}

function getUploadDispatcher(): EnvHttpProxyAgent {
  if (!uploadDispatcher) {
    uploadDispatcher = new EnvHttpProxyAgent(agentOpts());
  }
  return uploadDispatcher;
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

export function isTransientNetworkError(e: unknown): boolean {
  if (isConnectTimeoutError(e)) return true;
  if (!e || typeof e !== "object") return false;
  const err = e as { cause?: unknown; code?: string; message?: string };
  if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") return true;
  const c = err.cause;
  if (c && typeof c === "object" && "code" in c) {
    const code = (c as { code?: string }).code;
    if (code === "ECONNRESET" || code === "ETIMEDOUT") return true;
  }
  const msg = typeof err.message === "string" ? err.message : "";
  if (/socket hang up|ECONNRESET/i.test(msg)) return true;
  return false;
}

/** Registry / CDN：尊重 HTTPS_PROXY/HTTP_PROXY，弱网自动重试（含 POST publish） */
export async function fetchRegistry(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await undiciFetch(input, {
    ...init,
    dispatcher: getDispatcher(),
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}

/**
 * POST 原始字节（如 multipart）。走 undici `request()` + Buffer，**不**经 Web `fetch` 的 body 管线，
 * 可避免 `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH`（见 publish-pack）。
 */
export async function requestPostRegistry(
  url: string,
  options: {
    body: Buffer;
    headers: Record<string, string>;
  }
): Promise<{ statusCode: number; text: string }> {
  const { statusCode, body } = await undiciRequest(url, {
    method: "POST",
    body: options.body,
    headers: options.headers,
    dispatcher: getUploadDispatcher(),
  });
  const responseText = await text(body);
  return { statusCode, text: responseText };
}
