import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSON5 from "json5";
import * as jsonc from "jsonc-parser";
import { dbg } from "./cli-debug.js";

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
    (typeof agents?.defaults?.workspace === "string" && agents.defaults.workspace) ||
    (typeof agent?.workspace === "string" && agent.workspace) ||
    null;
  if (!w) return null;
  return path.resolve(expandHome(w));
}

const WORKSPACE_JSON_PATH: jsonc.JSONPath = ["agents", "defaults", "workspace"];

/**
 * If `raw` is valid JSONC (JSON with line/block comments, trailing commas), patch only
 * workspace fields so comments and layout are preserved. Returns null on failure.
 */
function tryWriteWorkspacePreservingComments(
  raw: string,
  workspaceAbsPath: string
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const errors: jsonc.ParseError[] = [];
  jsonc.parse(trimmed, errors, {
    allowTrailingComma: true,
    allowEmptyContent: false,
  });
  if (errors.length > 0) return null;

  const modificationOptions: jsonc.ModificationOptions = {
    formattingOptions: {
      tabSize: 2,
      insertSpaces: true,
      eol: "\n",
    },
  };

  let text = raw;
  const edits = jsonc.modify(
    text,
    WORKSPACE_JSON_PATH,
    workspaceAbsPath,
    modificationOptions
  );
  if (edits.length > 0) {
    text = jsonc.applyEdits(text, edits);
  }

  try {
    const data = JSON5.parse(text) as Record<string, unknown>;
    const defs = (data.agents as { defaults?: { workspace?: string } } | undefined)
      ?.defaults;
    if (defs?.workspace !== workspaceAbsPath) {
      return null;
    }
  } catch {
    return null;
  }

  return text.endsWith("\n") ? text : `${text}\n`;
}

function writeWorkspaceLossy(
  raw: string,
  workspaceAbsPath: string
): string {
  const data = JSON5.parse(raw || "{}") as Record<string, unknown>;
  if (!data.agents || typeof data.agents !== "object") data.agents = {};
  const agents = data.agents as Record<string, unknown>;
  if (!agents.defaults || typeof agents.defaults !== "object") agents.defaults = {};
  const defaults = agents.defaults as Record<string, unknown>;
  defaults.workspace = workspaceAbsPath;
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function backupAndWriteWorkspace(
  configPath: string,
  workspaceAbsPath: string,
  options?: { debug?: boolean; backupStamp?: string }
): { configBackupPath: string | null } {
  const debug = Boolean(options?.debug);
  let raw = "";
  if (fs.existsSync(configPath)) raw = fs.readFileSync(configPath, "utf8");

  let configBackupPath: string | null = null;
  if (fs.existsSync(configPath)) {
    const stamp =
      options?.backupStamp ??
      new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${configPath}.bak.${stamp}`;
    fs.copyFileSync(configPath, bak);
    configBackupPath = bak;
    dbg(`Backed up config to ${bak}`);
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });

  const preserved = raw.trim()
    ? tryWriteWorkspacePreservingComments(raw, workspaceAbsPath)
    : null;
  const out =
    preserved ??
    writeWorkspaceLossy(raw.trim() ? raw : "{}", workspaceAbsPath);

  fs.writeFileSync(configPath, out, "utf8");
  dbg(
    `Updated ${configPath} → agents.defaults.workspace = ${workspaceAbsPath}`
  );
  if (preserved) {
    dbg(
      "Note: updated via JSONC surgical edits — // and /* */ comments kept where possible."
    );
  } else if (raw.trim()) {
    dbg(
      "Note: file was rewritten (JSON5 parse + JSON.stringify). Comments lost — use strict JSON/JSONC in openclaw.json for comment-safe updates next time."
    );
  }
  return { configBackupPath };
}
