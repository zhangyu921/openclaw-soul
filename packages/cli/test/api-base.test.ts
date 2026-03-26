import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_OPENCLAW_SOUL_API } from "../src/constants.ts";
import { resolveDefaultApiBase } from "../src/load-env.ts";

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
}

describe("resolveDefaultApiBase", () => {
  let base: string;
  let prevCwd: string;
  let prevApi: string | undefined;
  let prevAllowLocal: string | undefined;

  beforeEach(() => {
    prevCwd = process.cwd();
    prevApi = process.env.OPENCLAW_SOUL_API;
    prevAllowLocal = process.env.OPENCLAW_SOUL_ALLOW_LOCALHOST;
    delete process.env.OPENCLAW_SOUL_API;
    delete process.env.OPENCLAW_SOUL_ALLOW_LOCALHOST;
    base = fs.mkdtempSync(path.join(os.tmpdir(), "ocs-api-test-"));
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevApi === undefined) {
      delete process.env.OPENCLAW_SOUL_API;
    } else {
      process.env.OPENCLAW_SOUL_API = prevApi;
    }
    if (prevAllowLocal === undefined) {
      delete process.env.OPENCLAW_SOUL_ALLOW_LOCALHOST;
    } else {
      process.env.OPENCLAW_SOUL_ALLOW_LOCALHOST = prevAllowLocal;
    }
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("uses OPENCLAW_SOUL_API when set (strips trailing slash)", () => {
    process.env.OPENCLAW_SOUL_API = "https://example.com/registry/";
    expect(resolveDefaultApiBase("file:///any/index.js")).toBe(
      "https://example.com/registry"
    );
  });

  it("keeps localhost:3000 in env when using workspace-installed CLI", () => {
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
    const entryUrl = pathToFileURL(path.join(dist, "index.js")).href;
    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    process.env.OPENCLAW_SOUL_API = "http://localhost:3000";
    expect(resolveDefaultApiBase(entryUrl)).toBe("http://localhost:3000");
  });

  it("defaults to localhost when cwd is in monorepo and entry is workspace node_modules cli", () => {
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
    const entryUrl = pathToFileURL(path.join(dist, "index.js")).href;
    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    expect(resolveDefaultApiBase(entryUrl)).toBe("http://localhost:3000");
  });

  it("ignores stale localhost:3000 in env for published install (npx-style path)", () => {
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
    const npxEntry = pathToFileURL(path.join(npxCli, "dist", "index.js")).href;

    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    process.env.OPENCLAW_SOUL_API = "http://localhost:3000";
    expect(resolveDefaultApiBase(npxEntry)).toBe(DEFAULT_OPENCLAW_SOUL_API);
  });

  it("honors localhost:3000 in env when OPENCLAW_SOUL_ALLOW_LOCALHOST=1 (published install)", () => {
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
    const npxEntry = pathToFileURL(path.join(npxCli, "dist", "index.js")).href;

    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    process.env.OPENCLAW_SOUL_API = "http://localhost:3000";
    process.env.OPENCLAW_SOUL_ALLOW_LOCALHOST = "1";
    expect(resolveDefaultApiBase(npxEntry)).toBe("http://localhost:3000");
  });

  it("defaults to production URL when entry is not the workspace install (npx-style path)", () => {
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
    const npxEntry = pathToFileURL(path.join(npxCli, "dist", "index.js")).href;

    const nested = path.join(root, "packages", "foo");
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    expect(resolveDefaultApiBase(npxEntry)).toBe(DEFAULT_OPENCLAW_SOUL_API);
  });

  it("documents the public default hostname (regression guard)", () => {
    expect(DEFAULT_OPENCLAW_SOUL_API).toBe(
      "https://openclaw-soul.basilfield.com"
    );
  });
});
