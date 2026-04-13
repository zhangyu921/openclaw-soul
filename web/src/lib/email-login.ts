import crypto from "node:crypto";

const EMAIL_CODE_DIGITS = 6;
export const EMAIL_CODE_TTL_SECONDS = 10 * 60;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set (min 16 chars)");
  }
  return secret;
}

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function generateEmailLoginCode(): string {
  const min = 10 ** (EMAIL_CODE_DIGITS - 1);
  const max = 10 ** EMAIL_CODE_DIGITS;
  return String(crypto.randomInt(min, max));
}

export function hashEmailLoginCode(email: string, code: string): string {
  const normalized = normalizeAuthEmail(email);
  return crypto
    .createHash("sha256")
    .update(`${authSecret()}:${normalized}:${code}`)
    .digest("hex");
}
