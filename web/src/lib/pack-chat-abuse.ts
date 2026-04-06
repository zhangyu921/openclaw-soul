export const CHAT_RATE_WINDOW_MS = 60_000;
export const CHAT_RATE_MAX_PER_WINDOW = 20;

export type ChatAbuseContext = {
  userId: string;
  packId: string;
  clientIp: string | null;
};

export type ChatAbuseResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export type ChatAbusePolicy = (ctx: ChatAbuseContext) => Promise<ChatAbuseResult>;

const recentByUser = new Map<string, number[]>();

export function perUserMinuteLimitPolicy(): ChatAbusePolicy {
  return async (ctx: ChatAbuseContext) => {
    const now = Date.now();
    const prev = recentByUser.get(ctx.userId) ?? [];
    const windowStart = now - CHAT_RATE_WINDOW_MS;
    const kept = prev.filter((t) => t > windowStart);
    if (kept.length >= CHAT_RATE_MAX_PER_WINDOW) {
      return {
        ok: false,
        status: 429,
        error: "rate limit exceeded; try again later",
      };
    }
    kept.push(now);
    recentByUser.set(ctx.userId, kept);
    return { ok: true };
  };
}

export async function runChatAbusePolicies(
  ctx: ChatAbuseContext,
  policies: ChatAbusePolicy[]
): Promise<ChatAbuseResult> {
  for (const p of policies) {
    const r = await p(ctx);
    if (!r.ok) return r;
  }
  return { ok: true };
}
