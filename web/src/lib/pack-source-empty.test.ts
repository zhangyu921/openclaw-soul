import { describe, expect, it, vi } from "vitest";
import { packIsSourceEmpty } from "@/lib/pack-source-empty";

describe("packIsSourceEmpty", () => {
  it("returns true when both counts are 0", async () => {
    const db = {
      packMarkdownFile: { count: vi.fn().mockResolvedValue(0) },
      packBinaryFile: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(packIsSourceEmpty(db as never, "pid")).resolves.toBe(true);
  });

  it("returns false when md exists", async () => {
    const db = {
      packMarkdownFile: { count: vi.fn().mockResolvedValue(1) },
      packBinaryFile: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(packIsSourceEmpty(db as never, "pid")).resolves.toBe(false);
  });
});
