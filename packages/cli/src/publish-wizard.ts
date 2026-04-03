import fs from "node:fs";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { resolveWorkspacePath } from "./load-env.js";
import { readWorkspaceFromConfig } from "./openclaw-config.js";
import { readIdentityDefaults } from "./read-identity.js";
import { validateSlug } from "./slug.js";
import { WORKSPACE_ROOT_FILE_ALLOWLIST } from "./workspace-root-files.js";

export type WizardPublishResult = {
  slug: string;
  source: string;
  /** Set when interactive file picker ran; omitted when `--full` skips prompts. */
  fullZip?: boolean;
  selectedRootFiles?: string[];
};

function resolveSourceDir(source: string, configPath: string): string {
  if (source === "current") {
    const w = readWorkspaceFromConfig(configPath);
    if (!w) throw new Error(`Could not read workspace from ${configPath}`);
    return w;
  }
  const abs = resolveWorkspacePath(source);
  if (!fs.existsSync(abs)) throw new Error(`Source not found: ${abs}`);
  return abs;
}

type CheckboxChoice = {
  value: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean | string;
};

function collectRootFileNames(sourceDir: string): Set<string> {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  return new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
}

function listExtras(fileNames: Set<string>): string[] {
  const extras = [...WORKSPACE_ROOT_FILE_ALLOWLIST].filter(
    (n) =>
      n !== "SOUL.md" &&
      n !== "MEMORY.md" &&
      n !== "IDENTITY.md" &&
      fileNames.has(n)
  );
  extras.sort();
  return extras;
}

/** Subset-mode checkbox choices (整包由前置 confirm 处理，不在此列表中). */
function buildSubsetChoices(
  fileNames: Set<string>,
  extras: string[],
  snapshot: string[] | undefined
): CheckboxChoice[] {
  const hasIdentity = fileNames.has("IDENTITY.md");
  const hasMemory = fileNames.has("MEMORY.md");

  const identityChecked = snapshot
    ? snapshot.includes("IDENTITY.md")
    : hasIdentity;

  const memoryChecked = snapshot
    ? snapshot.includes("MEMORY.md")
    : false;

  const choices: CheckboxChoice[] = [
    {
      name: "SOUL.md（必选）",
      value: "SOUL.md",
      checked: true,
      disabled: true,
    },
    {
      name: hasIdentity
        ? "IDENTITY.md"
        : "IDENTITY.md（根目录无此文件，不会打入 zip）",
      value: "IDENTITY.md",
      checked: hasIdentity ? identityChecked : false,
      disabled: !hasIdentity,
    },
    {
      name: hasMemory
        ? "MEMORY.md"
        : "MEMORY.md（根目录无此文件，不会打入 zip）",
      value: "MEMORY.md",
      checked: memoryChecked,
      disabled: !hasMemory,
    },
    ...extras.map((n) => ({
      name: n,
      value: n,
      checked: snapshot ? snapshot.includes(n) : false,
    })),
  ];

  return choices;
}

function normalizeSubsetSelection(picked: string[]): string[] {
  return [...new Set([...picked, "SOUL.md"])];
}

async function promptPackRootFiles(sourceDir: string): Promise<{
  fullZip: boolean;
  selectedRootFiles?: string[];
}> {
  const fileNames = collectRootFileNames(sourceDir);
  const extras = listExtras(fileNames);

  const choices = buildSubsetChoices(fileNames, extras, undefined);

  const picked = await checkbox({
    message: "要打入 zip 的 workspace 根文件（可多选）：",
    choices,
    validate: (normalized) => {
      const values = normalized.filter((c) => c.checked).map((c) => c.value);
      if (values.length === 0) {
        return "请至少选择一项（SOUL.md 为必选）";
      }
      return true;
    },
  });

  return {
    fullZip: false,
    selectedRootFiles: normalizeSubsetSelection(picked),
  };
}

export async function runPublishWizard(params: {
  configPath: string;
  slug: string;
  source: string;
  /** When true, do not prompt for root files (caller already passed e.g. `--full`). */
  skipPackRootPrompt?: boolean;
}): Promise<WizardPublishResult> {
  let source = params.source;
  let slug = params.slug.trim();
  let fullZip: boolean | undefined;
  let selectedRootFiles: string[] | undefined;

  if (!slug) {
    const sourceChoice = await select({
      message: "Pack from:",
      choices: [
        { name: "Current OpenClaw workspace (openclaw.json)", value: "current" },
        { name: "Other directory", value: "other" },
      ],
    });

    if (sourceChoice === "other") {
      source = (
        await input({
          message: "Directory path:",
          validate: (raw) => {
            const p = raw.trim();
            if (!p) return "Required";
            const abs = resolveWorkspacePath(p);
            if (!fs.existsSync(abs)) return "Path not found";
            return true;
          },
        })
      ).trim();
    } else {
      source = "current";
    }

    const sourceDir = resolveSourceDir(source, params.configPath);
    const identity = readIdentityDefaults(sourceDir);
    const defaultSlug = identity?.slugCandidate ?? "";

    const s = await input({
      message: "Pack slug (from IDENTITY Name if present):",
      default: defaultSlug || undefined,
      validate: (raw) => {
        const t = raw.trim();
        if (!t) return "Required";
        try {
          validateSlug(t);
          return true;
        } catch (e) {
          return (e as Error).message;
        }
      },
    });
    slug = s.trim();
    validateSlug(slug);

    if (!params.skipPackRootPrompt) {
      const wantFull = await confirm({
        message:
          "是否上传整个 workspace 目录（含子文件夹，等同 --full）？",
        default: false,
      });
      if (wantFull) {
        fullZip = true;
      } else {
        const pick = await promptPackRootFiles(sourceDir);
        fullZip = pick.fullZip;
        selectedRootFiles = pick.selectedRootFiles;
      }
    }
  }

  const out: WizardPublishResult = {
    slug,
    source,
  };
  if (fullZip !== undefined) {
    out.fullZip = fullZip;
    if (selectedRootFiles) out.selectedRootFiles = selectedRootFiles;
  }
  return out;
}
