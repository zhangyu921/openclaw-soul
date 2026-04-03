import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolvePublishTitle } from "../src/resolve-publish-title.js";

describe("resolvePublishTitle", () => {
  it("uses explicit title when set", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-title-"));
    try {
      expect(resolvePublishTitle(dir, "slug", "  Hello  ")).toBe("Hello");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("uses IDENTITY Name when no explicit title", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-title-"));
    try {
      fs.writeFileSync(
        path.join(dir, "IDENTITY.md"),
        "**Name**: Test Persona\n",
        "utf8"
      );
      expect(resolvePublishTitle(dir, "my-slug", "")).toBe("Test Persona");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("falls back to slug without IDENTITY", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-title-"));
    try {
      expect(resolvePublishTitle(dir, "only-slug", "")).toBe("only-slug");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
