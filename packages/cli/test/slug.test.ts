import { describe, expect, it } from "vitest";
import { slugifyDisplayName, validateSlug } from "../src/slug.ts";

describe("validateSlug", () => {
  it("accepts lowercase hyphenated slugs", () => {
    expect(() => validateSlug("my-pack")).not.toThrow();
    expect(() => validateSlug("a")).not.toThrow();
  });

  it("rejects uppercase and spaces", () => {
    expect(() => validateSlug("My-Pack")).toThrow();
    expect(() => validateSlug("a b")).toThrow();
  });
});

describe("slugifyDisplayName", () => {
  it("normalizes display names", () => {
    expect(slugifyDisplayName("  Hello World  ")).toBe("hello-world");
  });
});
