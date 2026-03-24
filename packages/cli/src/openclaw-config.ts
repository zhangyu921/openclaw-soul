import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSON5 from "json5";

export function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p === "~") return os.homedir();
  return p;
}

export function defaultOpenclawConfigPath(): string {
  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

export function readWorkspaceFromConfig(configPath: string): string | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf8");
  const data = JSON5.parse(raw) as Record<string, unknown>;
  const agent = data.agent as Record<string, unknown> | undefined;
  const agents = data.agents as { defaults?: { workspace?: string } } | undefined;
  const w =
    (typeof agent?.workspace === "string" && agent.workspace) ||
    (typeof agents?.defaults?.workspace === "string" && agents.defaults.workspace) ||
    null;
  if (!w) return null;
  return path.resolve(expandHome(w));
}

export function backupAndWriteWorkspace(
  configPath: string,
  workspaceAbsPath: string
): void {
  let raw = "{}";
  if (fs.existsSync(configPath)) raw = fs.readFileSync(configPath, "utf8");
  const data = JSON5.parse(raw) as Record<string, unknown>;
  if (!data.agent || typeof data.agent !== "object") data.agent = {};
  const agent = data.agent as Record<string, unknown>;
  agent.workspace = workspaceAbsPath;
  if (fs.existsSync(configPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${configPath}.bak.${stamp}`;
    fs.copyFileSync(configPath, bak);
    console.error(`Backed up config to ${bak}`);
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    `${JSON5.stringify(data, null, 2)}\n`,
    "utf8"
  );
  console.error(`Updated ${configPath} → agent.workspace = ${workspaceAbsPath}`);
  console.error(
    "Note: round-trip via JSON5.stringify; original comments in openclaw.json are still not preserved."
  );
}
