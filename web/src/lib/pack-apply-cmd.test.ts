import { describe, expect, it } from "vitest";
import { buildPackApplyCommand } from "./pack-apply-cmd";

describe("buildPackApplyCommand", () => {
  it("returns npx apply line for handle and slug", () => {
    expect(buildPackApplyCommand("alice", "my-soul")).toBe(
      "npx @openclaw-soul/cli apply alice/my-soul"
    );
  });
});
