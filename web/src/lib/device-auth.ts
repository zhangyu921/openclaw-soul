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

export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (url.protocol === "https:" ? "https" : "http");
  if (host) return `${proto}://${host}`;
  return url.origin;
}
