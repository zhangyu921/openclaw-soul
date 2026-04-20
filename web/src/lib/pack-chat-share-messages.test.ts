import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { filterMessagesForShowcaseShare } from "./pack-chat-share-messages";

describe("filterMessagesForShowcaseShare", () => {
  it("drops assistant error messages", () => {
    const ok: UIMessage = {
      id: "a",
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
    };
    const bad: UIMessage = {
      id: "assistant-error-x",
      role: "assistant",
      parts: [{ type: "text", text: "stack" }],
    };
    expect(filterMessagesForShowcaseShare([ok, bad])).toEqual([ok]);
  });
});
