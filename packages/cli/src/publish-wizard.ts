import fs from "node:fs";
import { confirm, input, select } from "@inquirer/prompts";
import { resolveWorkspacePath } from "./load-env.js";
import { validateSlug } from "./slug.js";

export type WizardPublishResult = {
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
};

export async function runPublishWizard(params: {
  slug: string;
  title: string;
  summary?: string;
  source: string;
  avatar?: string;
}): Promise<WizardPublishResult> {
  let slug = params.slug.trim();
  let title = params.title.trim();
  const hadMissingNames = !slug || !title;

  while (!slug) {
    const s = await input({
      message: "Pack slug (lowercase, e.g. my-persona):",
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

  while (!title) {
    title = (
      await input({
        message: "Display title:",
        validate: (raw) => (raw.trim() ? true : "Required"),
      })
    ).trim();
  }

  let summary = (params.summary ?? "").trim();
  let source = params.source;
  let avatar = params.avatar;

  if (hadMissingNames) {
    const customize = await confirm({
      message: "Customize summary, source folder, or avatar?",
      default: false,
    });

    if (customize) {
      summary = (
        await input({
          message: "Summary (optional, press Enter to skip):",
          default: summary,
        })
      ).trim();

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
