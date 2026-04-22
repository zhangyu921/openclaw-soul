import { describe, expect, it } from "vitest";
import { shouldCountPackProfileView } from "./pack-profile-view";

describe("shouldCountPackProfileView", () => {
  it("returns true when not logged in", () => {
    expect(shouldCountPackProfileView({ sessionUserId: null, authorId: "a" })).toBe(true);
  });

  it("returns false when viewer is the author", () => {
    expect(shouldCountPackProfileView({ sessionUserId: "u1", authorId: "u1" })).toBe(false);
  });

  it("returns true when logged in as a different user", () => {
    expect(shouldCountPackProfileView({ sessionUserId: "u1", authorId: "u2" })).toBe(true);
  });
});
