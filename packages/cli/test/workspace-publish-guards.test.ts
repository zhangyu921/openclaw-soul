import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertWorkspaceRootSoulFileExists,
  buildNonInteractiveSubsetFiles,
} from "../src/workspace-publish-guards.ts";

describe("assertWorkspaceRootSoulFileExists", () => {
  it("throws when SOUL.md is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "ocs-soul-miss-"));
    try {
      expect(() => assertWorkspaceRootSoulFileExists(dir)).toThrow(
        /SOUL\.md/
      );
      expect(() => assertWorkspaceRootSoulFileExists(dir)).toThrow(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("buildNonInteractiveSubsetFiles", () => {
  it("returns only SOUL.md when no IDENTITY and no includes", () => {
    const dir = mkdtempSync(join(tmpdir(), "ocs-sub-soul-"));
    try {
      writeFileSync(join(dir, "SOUL.md"), "s");
      expect(buildNonInteractiveSubsetFiles(dir, [])).toEqual(["SOUL.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("includes IDENTITY.md when present as a file at workspace root", () => {
    const dir = mkdtempSync(join(tmpdir(), "ocs-sub-id-"));
    try {
      writeFileSync(join(dir, "SOUL.md"), "s");
      writeFileSync(join(dir, "IDENTITY.md"), "i");
      expect(buildNonInteractiveSubsetFiles(dir, [])).toEqual([
        "SOUL.md",
        "IDENTITY.md",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("includes MEMORY.md when listed in includeNames", () => {
    const dir = mkdtempSync(join(tmpdir(), "ocs-sub-mem-"));
    try {
      writeFileSync(join(dir, "SOUL.md"), "s");
      writeFileSync(join(dir, "MEMORY.md"), "m");
      expect(buildNonInteractiveSubsetFiles(dir, ["MEMORY.md"])).toEqual([
        "SOUL.md",
        "MEMORY.md",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
