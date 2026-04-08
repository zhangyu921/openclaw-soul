import { describe, expect, it } from "vitest";

import { mergeMessagesWithFallback } from "./i18n-messages";

describe("mergeMessagesWithFallback", () => {
  it("fills missing zh leaf from en", () => {
    const en = { a: { x: "1", y: "2" }, b: "3" };
    const zh = { a: { x: "一" } };
    const m = mergeMessagesWithFallback(en, zh);
    expect(m).toEqual({ a: { x: "一", y: "2" }, b: "3" });
  });
});
