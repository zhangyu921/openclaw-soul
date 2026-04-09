import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { textFromMessage } from "./pack-chat-message-text";

describe("textFromMessage", () => {
  it("joins multiple text parts in order", () => {
    const m = {
      id: "a",
      role: "assistant",
      parts: [
        { type: "text" as const, text: "Hello " },
        { type: "text" as const, text: "world" },
      ],
    } as UIMessage;
    expect(textFromMessage(m)).toBe("Hello world");
  });

  it("returns empty string when there are no text parts", () => {
    const m = {
      id: "b",
      role: "user",
      parts: [],
    } as UIMessage;
    expect(textFromMessage(m)).toBe("");
  });
});
