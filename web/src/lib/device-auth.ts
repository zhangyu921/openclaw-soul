import { createHash, randomBytes } from "node:crypto";

export const DEVICE_LOGIN_EXPIRY_MS = 15 * 60 * 1000;
export const DEVICE_POLL_INTERVAL_SEC = 3;

export function hashDeviceCode(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

const USER_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateUserCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += USER_CODE_CHARS[randomBytes(1)[0]! % USER_CODE_CHARS.length];
  }
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function generateDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * 对外展示的站点 origin（device 授权链接等）。
 * 若 Vercel 同时绑了 `*.vercel.app` 与自定义域，可设 `OPENCLAW_SOUL_SITE_URL=https://你的主域`
 * 避免用户永远看到默认部署域。
 */
function canonicalSiteUrlFromHeaders(h: Headers): string {
  const rawHost =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "";
  const host = rawHost || "localhost:3000";
  const rawProto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() || "";
  const proto =
    rawProto === "http" || rawProto === "https"
      ? rawProto
      : process.env.VERCEL
        ? "https"
        : "http";
  return `${proto}://${host}`;
}

/**
 * 与 `requestOrigin` 一致：优先 `OPENCLAW_SOUL_SITE_URL`，供 App Router `headers()` 场景使用。
 */
export function siteOriginFromNextHeaders(h: Headers): string {
  const fixed = process.env.OPENCLAW_SOUL_SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  return canonicalSiteUrlFromHeaders(h);
}

export function requestOrigin(req: Request): string {
  const fixed = process.env.OPENCLAW_SOUL_SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (url.protocol === "https:" ? "https" : "http");
  if (host) return `${proto}://${host}`;
  return url.origin;
}
