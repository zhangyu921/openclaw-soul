import { describe, expect, it } from "vitest";

import {
  CHAT_RATE_MAX_PER_WINDOW,
  perUserMinuteLimitPolicy,
  runChatAbusePolicies,
} from "./pack-chat-abuse";

describe("perUserMinuteLimitPolicy", () => {
  it("returns 429 after too many requests in window", async () => {
    const policy = perUserMinuteLimitPolicy();
    const ctx = {
      userId: "u1",
      packId: "p1",
      clientIp: "127.0.0.1",
    };
    for (let i = 0; i < CHAT_RATE_MAX_PER_WINDOW; i++) {
      const r = await runChatAbusePolicies(ctx, [policy]);
      expect(r.ok).toBe(true);
    }
    const last = await runChatAbusePolicies(ctx, [policy]);
    expect(last.ok).toBe(false);
    if (!last.ok) {
      expect(last.status).toBe(429);
    }
  });
});
