import fs from "node:fs";
import { confirm, input, select } from "@inquirer/prompts";
import { resolveWorkspacePath } from "./load-env.js";
import { readWorkspaceFromConfig } from "./openclaw-config.js";
import { readIdentityDefaults } from "./read-identity.js";
import { validateSlug } from "./slug.js";

export type WizardPublishResult = {
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
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

export async function runPublishWizard(params: {
  configPath: string;
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
}): Promise<WizardPublishResult> {
  let source = params.source;
  let summary = (params.summary ?? "").trim();
  let avatar = params.avatar;
  let slug = params.slug.trim();
  let title = params.title.trim();

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

  return {
    slug,
    title,
    summary: summary || undefined,
    source,
    avatar,
  };
}
