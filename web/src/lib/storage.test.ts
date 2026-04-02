import { describe, expect, it } from "vitest";
import {
  binaryRelPathForPack,
  binaryStorageFileName,
} from "./storage";

describe("binaryStorageFileName", () => {
  it("is stable for the same entryPath", () => {
    expect(binaryStorageFileName("foo/bar")).toBe(
      binaryStorageFileName("foo/bar")
    );
  });

  it("differs when path content differs", () => {
    expect(binaryStorageFileName("a/b")).not.toBe(binaryStorageFileName("a/c"));
  });

  it("does not embed raw path segments (no .. or /)", () => {
    const n = binaryStorageFileName("../../../etc/passwd");
    expect(n).not.toContain("..");
    expect(n).not.toContain("/");
  });
});

describe("binaryRelPathForPack", () => {
  it("places files under packs/<packId>/bin/", () => {
    expect(binaryRelPathForPack("abc123", "x/y.png")).toMatch(
      /^packs\/abc123\/bin\/[a-f0-9]{16}_y\.png$/
    );
  });
});
