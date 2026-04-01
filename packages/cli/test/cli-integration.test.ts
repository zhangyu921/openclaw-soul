import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isolatedHome, removeDir, runOcs } from "./helpers.ts";

describe("CLI integration (isolated HOME)", () => {
  let home: string | undefined;
  afterEach(() => {
    if (home) removeDir(home);
    home = undefined;
  });

  it("prints help with exit 0", () => {
    const r = runOcs(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toContain("apply");
    expect(r.stdout + r.stderr).toContain("login");
  });

  it("backup-openclaw-config and restore-openclaw-config --list / --latest", () => {
    home = isolatedHome();
    const openclawDir = join(home, ".openclaw");
    mkdirSync(openclawDir, { recursive: true });
    const config = join(openclawDir, "openclaw.json");
    writeFileSync(config, '{"agents":{"defaults":{"workspace":"/x"}}}\n');

    const env = {
      HOME: home,
      OPENCLAW_CONFIG: config,
    };

    const b = runOcs(["backup-openclaw-config", "--config", config], env);
    expect(b.status).toBe(0);
    const bakPath = b.stdout.trim();
    expect(bakPath).toContain(".bak.");
    expect(existsSync(bakPath)).toBe(true);

    writeFileSync(config, '{"agents":{"defaults":{"workspace":"/y"}}}\n');

    const list = runOcs(["restore-openclaw-config", "--config", config, "--list"], env);
    expect(list.status).toBe(0);
    expect(list.stdout).toContain(".bak.");

    const rest = runOcs(["restore-openclaw-config", "--config", config, "--latest"], env);
    expect(rest.status).toBe(0);
    expect(readFileSync(config, "utf8")).toContain("/x");
  });

  it("archive-directory renames a directory", () => {
    home = isolatedHome();
    const dir = join(home, "d");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "f.txt"), "x");
    const env = { HOME: home };
    const r = runOcs(["archive-directory", dir], env);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toContain(".bak.");
    expect(existsSync(dir)).toBe(false);
    expect(existsSync(r.stdout.trim())).toBe(true);
  });
});
