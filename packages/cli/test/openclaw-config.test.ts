import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  backupAndWriteWorkspace,
  readWorkspaceFromConfig,
} from "../src/openclaw-config.ts";
import { isolatedHome, removeDir } from "./helpers.ts";

describe("backupAndWriteWorkspace", () => {
  let home: string | undefined;
  afterEach(() => {
    if (home) removeDir(home);
  });

  it("writes workspace and creates .bak when config exists", () => {
    home = isolatedHome();
    const config = join(home, "openclaw.json");
    mkdirSync(home, { recursive: true });
    writeFileSync(
      config,
      JSON.stringify({ agents: { defaults: { workspace: "/old" } } }, null, 2)
    );
    const ws = join(home, "ws");
    const stamp = "test-stamp";
    const { configBackupPath } = backupAndWriteWorkspace(config, ws, {
      backupStamp: stamp,
    });
    expect(configBackupPath).toBe(`${config}.bak.${stamp}`);
    expect(readFileSync(configBackupPath!, "utf8")).toContain("/old");
    const raw = readFileSync(config, "utf8");
    const data = JSON.parse(raw) as { agents: { defaults: { workspace: string } } };
    expect(data.agents.defaults.workspace).toBe(ws);
  });

  it("creates config without backup when file did not exist", () => {
    home = isolatedHome();
    const config = join(home, "openclaw.json");
    mkdirSync(home, { recursive: true });
    const ws = join(home, "ws");
    const { configBackupPath } = backupAndWriteWorkspace(config, ws);
    expect(configBackupPath).toBeNull();
    expect(readFileSync(config, "utf8")).toContain(ws);
  });
});

describe("readWorkspaceFromConfig", () => {
  let home: string | undefined;
  afterEach(() => {
    if (home) removeDir(home);
  });

  it("reads agents.defaults.workspace", () => {
    home = isolatedHome();
    const config = join(home, "openclaw.json");
    mkdirSync(home, { recursive: true });
    const ws = join(home, "my-ws");
    writeFileSync(
      config,
      JSON.stringify({ agents: { defaults: { workspace: ws } } }, null, 2)
    );
    expect(readWorkspaceFromConfig(config)).toBe(ws);
  });
});
