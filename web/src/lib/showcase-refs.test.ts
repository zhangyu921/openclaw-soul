import { describe, expect, it } from "vitest";

import { normalizeShowcaseImageRefs } from "./showcase-refs";

describe("normalizeShowcaseImageRefs", () => {
  it("filters to non-empty strings", () => {
    expect(normalizeShowcaseImageRefs(["a", "", "b", 3, null])).toEqual(["a", "b"]);
  });

  it("returns empty for non-array", () => {
    expect(normalizeShowcaseImageRefs(undefined)).toEqual([]);
    expect(normalizeShowcaseImageRefs({})).toEqual([]);
  });
});
