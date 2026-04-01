import fs from "node:fs";
import { checkbox, confirm, input, select, Separator } from "@inquirer/prompts";
import { resolveWorkspacePath } from "./load-env.js";
import { readWorkspaceFromConfig } from "./openclaw-config.js";
import { readIdentityDefaults } from "./read-identity.js";
import { validateSlug } from "./slug.js";
import { WORKSPACE_ROOT_FILE_ALLOWLIST } from "./workspace-root-files.js";

const PACK_FULL_SENTINEL = "__FULL_WORKSPACE__";

export type WizardPublishResult = {
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
  /** Set when interactive file picker ran; omitted when slug/title were both preset. */
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

async function promptPackRootFiles(sourceDir: string): Promise<{
  fullZip: boolean;
  selectedRootFiles?: string[];
}> {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const fileNames = new Set(
    entries.filter((e) => e.isFile()).map((e) => e.name)
  );

  const extras = [...WORKSPACE_ROOT_FILE_ALLOWLIST].filter(
    (n) => n !== "SOUL.md" && n !== "MEMORY.md" && fileNames.has(n)
  );
  extras.sort();

  const choices: (
    | Separator
    | {
        value: string;
        name?: string;
        checked?: boolean;
        disabled?: boolean | string;
      }
  )[] = [
    {
      name: "SOUL.md（必选）",
      value: "SOUL.md",
      checked: true,
      disabled: true,
    },
    {
      name: "MEMORY.md",
      value: "MEMORY.md",
      checked: fileNames.has("MEMORY.md"),
    },
    ...extras.map((n) => ({ name: n, value: n, checked: false })),
    new Separator(),
    {
      name: "整个 workspace 目录（含子文件夹，等同 --full）",
      value: PACK_FULL_SENTINEL,
      checked: false,
    },
  ];

  const picked = await checkbox({
    message: "要打入 zip 的 workspace 根文件（可多选）：",
    choices,
    validate: (normalized) => {
      const values = normalized.filter((c) => c.checked).map((c) => c.value);
      if (values.includes(PACK_FULL_SENTINEL)) return true;
      if (values.length === 0) {
        return "请至少选择一项（SOUL.md 为必选）";
      }
      return true;
    },
  });

  if (picked.includes(PACK_FULL_SENTINEL)) {
    return { fullZip: true };
  }

  const selected = [...new Set(picked.filter((v) => v !== PACK_FULL_SENTINEL))];
  if (!selected.includes("SOUL.md")) {
    selected.unshift("SOUL.md");
  }
  return { fullZip: false, selectedRootFiles: selected };
}

export async function runPublishWizard(params: {
  configPath: string;
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
  /** When true, do not prompt for root files (caller already passed e.g. `--full`). */
  skipPackRootPrompt?: boolean;
}): Promise<WizardPublishResult> {
  let source = params.source;
  let summary = (params.summary ?? "").trim();
  let avatar = params.avatar;
  let slug = params.slug.trim();
  let title = params.title.trim();
  let fullZip: boolean | undefined;
  let selectedRootFiles: string[] | undefined;

  const missingSlugOrTitle = !slug || !title;

  if (missingSlugOrTitle) {
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
    const defaultTitle = identity?.displayName ?? (defaultSlug || "persona");

    if (!slug) {
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
    }
    validateSlug(slug);

    if (!title) {
      const t = await input({
        message: "Display title (Enter = use persona name or slug):",
        default: defaultTitle,
      });
      title = t.trim() || defaultTitle;
    }

    if (!params.skipPackRootPrompt) {
      const pick = await promptPackRootFiles(sourceDir);
      fullZip = pick.fullZip;
      selectedRootFiles = pick.selectedRootFiles;
    }

    const customize = await confirm({
      message: "Customize summary or avatar?",
      default: false,
    });

    if (customize) {
      summary = (
        await input({
          message: "Summary (optional, Enter to skip):",
          default: summary,
        })
      ).trim();

      const wantAvatar = await confirm({
        message: "Add avatar image?",
        default: false,
      });
      if (wantAvatar) {
        const p = await input({
          message: "Avatar file path:",
          validate: (raw) => {
            const t = raw.trim();
            if (!t) return "Required";
            const abs = resolveWorkspacePath(t);
            if (!fs.existsSync(abs)) return "File not found";
            if (!fs.statSync(abs).isFile()) return "Not a file";
            return true;
          },
        });
        avatar = resolveWorkspacePath(p.trim());
      } else {
        avatar = undefined;
      }
    }
  }

  const out: WizardPublishResult = {
    slug,
    title,
    summary: summary || undefined,
    source,
    avatar,
  };
  if (fullZip !== undefined) {
    out.fullZip = fullZip;
    if (selectedRootFiles) out.selectedRootFiles = selectedRootFiles;
  }
  return out;
}
