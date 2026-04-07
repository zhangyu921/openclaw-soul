import { streamText } from "ai";
import { describe, expect, it } from "vitest";

import { resolvePackChatModel } from "./chat-model";

const shouldRunLive =
  process.env.MINIMAX_LIVE_TEST === "1" &&
  Boolean(process.env.MINIMAX_TOKEN_PLAN_API_KEY?.trim());

describe.skipIf(!shouldRunLive)("MiniMax Anthropic (live)", () => {
  it(
    "streams a short reply",
    async () => {
      const model = resolvePackChatModel();
      expect(model).toBeTruthy();
      const result = streamText({
        model: model!,
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
