import { streamText } from "ai";
import { describe, expect, it } from "vitest";

import { resolvePackChatModel } from "./chat-model";

const shouldRunLive =
  process.env.MINIMAX_LIVE_TEST === "1" &&
  process.env.PACK_CHAT_PROVIDER?.trim().toLowerCase() === "minimax" &&
  Boolean(process.env.MINIMAX_TOKEN_PLAN_API_KEY?.trim());

describe.skipIf(!shouldRunLive)("MiniMax Anthropic (live)", () => {
  it(
    "streams a short reply",
    async () => {
      const resolved = resolvePackChatModel();
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      const result = streamText({
        model: resolved.model,
        prompt: "Reply with exactly the word OK and nothing else.",
      });
      let text = "";
      for await (const part of result.textStream) {
        text += part;
      }
      expect(text.trim().length).toBeGreaterThan(0);
    },
    90_000
  );
});
