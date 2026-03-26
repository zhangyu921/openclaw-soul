import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findMonorepoRoot,
  isWorkspaceCliForRoot,
} from "../src/load-env.ts";

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
}

describe("isWorkspaceCliForRoot", () => {
  let base: string;

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-cli-test-"));
  });

  afterEach(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("returns true when entry file is the workspace node_modules cli package", () => {
    const root = path.join(base, "repo");
    writeJson(path.join(root, "package.json"), { name: "openclaw-soul" });
    const dist = path.join(
      root,
      "node_modules",
      "@openclaw-soul",
      "cli",
      "dist"
    );
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(dist, "index.js"), "", "utf8");
    const entry = path.join(dist, "index.js");
    expect(isWorkspaceCliForRoot(root, pathToFileURL(entry).href)).toBe(true);
  });

  it("returns false when entry is another install (e.g. npx cache) than repo node_modules", () => {
    const root = path.join(base, "repo");
    writeJson(path.join(root, "package.json"), { name: "openclaw-soul" });
    const wsCli = path.join(root, "node_modules", "@openclaw-soul", "cli");
    fs.mkdirSync(path.join(wsCli, "dist"), { recursive: true });
    fs.writeFileSync(path.join(wsCli, "dist", "index.js"), "", "utf8");

    const npxCli = path.join(
      base,
      "npx-cache",
      "node_modules",
      "@openclaw-soul",
      "cli"
    );
    fs.mkdirSync(path.join(npxCli, "dist"), { recursive: true });
    fs.writeFileSync(path.join(npxCli, "dist", "index.js"), "", "utf8");

    expect(
      isWorkspaceCliForRoot(root, pathToFileURL(path.join(npxCli, "dist", "index.js")).href)
    ).toBe(false);
  });

  it("returns false when repo has no workspace cli install", () => {
    const root = path.join(base, "repo");
    writeJson(path.join(root, "package.json"), { name: "openclaw-soul" });
    const orphan = path.join(base, "orphan", "dist", "index.js");
    fs.mkdirSync(path.dirname(orphan), { recursive: true });
    fs.writeFileSync(orphan, "", "utf8");
    expect(isWorkspaceCliForRoot(root, pathToFileURL(orphan).href)).toBe(false);
  });
});

describe("findMonorepoRoot", () => {
  let base: string;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    base = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-cli-test-"));
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("finds repo root from a nested cwd", () => {
    const root = path.join(base, "repo");
    writeJson(path.join(root, "package.json"), { name: "openclaw-soul" });
    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    expect(findMonorepoRoot()).toBe(fs.realpathSync(root));
  });
});
