/**
 * In-process sliding window for successful publishes per user.
 * Serverless: each instance has its own counter (MVP).
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PUBLISHES_PER_WINDOW = 20;

const successTimestamps = new Map<string, number[]>();

function prune(userId: string, now: number): number[] {
  const ts = successTimestamps.get(userId) ?? [];
  const next = ts.filter((t) => now - t < WINDOW_MS);
  successTimestamps.set(userId, next);
  return next;
}

export function checkPublishRateLimit(userId: string):
  | { ok: true }
  | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const ts = prune(userId, now);
  if (ts.length >= MAX_PUBLISHES_PER_WINDOW) {
    const oldest = ts[0]!;
    return {
      ok: false,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
    };
  }
  return { ok: true };
}

export function recordPublishSuccess(userId: string): void {
  const now = Date.now();
  const ts = prune(userId, now);
  ts.push(now);
  successTimestamps.set(userId, ts);
}
