import { describe, expect, it } from "vitest";
import { isMarkdownPath, normalizeZipEntryPath } from "./pack-paths";

describe("normalizeZipEntryPath", () => {
  it("rejects parent traversal (../x)", () => {
    expect(normalizeZipEntryPath("../x")).toBeNull();
    expect(normalizeZipEntryPath("a/../b")).toBeNull();
  });

  it("collapses duplicate slashes (foo//bar)", () => {
    expect(normalizeZipEntryPath("foo//bar")).toBe("foo/bar");
    expect(normalizeZipEntryPath("foo///bar//baz")).toBe("foo/bar/baz");
  });

  it("treats .md-only path as a valid normalized entry (.md boundary)", () => {
    expect(normalizeZipEntryPath(".md")).toBe(".md");
  });

  it("rejects empty and absolute paths", () => {
    expect(normalizeZipEntryPath("")).toBeNull();
    expect(normalizeZipEntryPath("   ")).toBeNull();
    expect(normalizeZipEntryPath("/etc/passwd")).toBeNull();
    expect(normalizeZipEntryPath("C:/Windows")).toBeNull();
  });

  it("unifies backslashes to forward slashes", () => {
    expect(normalizeZipEntryPath("a\\b\\c")).toBe("a/b/c");
  });
});

describe("isMarkdownPath", () => {
  it("is case-insensitive on .md extension (spec §2.1)", () => {
    expect(isMarkdownPath("SOUL.md")).toBe(true);
    expect(isMarkdownPath("x.MD")).toBe(true);
    expect(isMarkdownPath("dir/file.Md")).toBe(true);
    expect(isMarkdownPath(".md")).toBe(true);
    expect(isMarkdownPath("readme.txt")).toBe(false);
  });
});
