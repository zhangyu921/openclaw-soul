import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { isAssistantErrorMessage } from "./pack-chat-assistant-error";

describe("isAssistantErrorMessage", () => {
  it("returns true for assistant message with error id prefix", () => {
    const m = {
      id: "assistant-error-abc",
      role: "assistant",
      parts: [{ type: "text" as const, text: "err" }],
    } satisfies UIMessage;
    expect(isAssistantErrorMessage(m)).toBe(true);
  });

  it("returns false for normal assistant", () => {
    const m = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text" as const, text: "hi" }],
    } satisfies UIMessage;
    expect(isAssistantErrorMessage(m)).toBe(false);
  });
});
