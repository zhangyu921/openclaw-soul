import { describe, expect, it } from "vitest";

import { normalizeShowcaseImageRefs } from "./showcase-refs";

describe("normalizeShowcaseImageRefs", () => {
  it("maps legacy string entries to { ref }", () => {
    expect(normalizeShowcaseImageRefs(["a", "", "b", 3, null])).toEqual([
      { ref: "a" },
      { ref: "b" },
    ]);
  });

  it("accepts object entries with ref and dimensions", () => {
    expect(
      normalizeShowcaseImageRefs([
        { ref: "x.png", width: 800, height: 400 },
        { ref: "bad", width: -1 },
      ])
    ).toEqual([{ ref: "x.png", width: 800, height: 400 }, { ref: "bad" }]);
  });

  it("returns empty for non-array", () => {
    expect(normalizeShowcaseImageRefs(undefined)).toEqual([]);
    expect(normalizeShowcaseImageRefs({})).toEqual([]);
  });
});
