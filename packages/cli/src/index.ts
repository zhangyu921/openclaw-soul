#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { Command } from "commander";
import { loadCliEnv, resolveWorkspacePath, findMonorepoRoot } from "./load-env.js";
import {
  backupAndWriteWorkspace,
  defaultOpenclawConfigPath,
  readWorkspaceFromConfig,
} from "./openclaw-config.js";
import { downloadToFile, extractZip } from "./zip-utils.js";
import { importFromManifest } from "./import-pack.js";
import { publishPack } from "./publish-pack.js";
import { runPublishWizard } from "./publish-wizard.js";
import { runDeviceLogin } from "./device-login.js";
import { upsertEnvCliLine, setEnvCliLineIfMissing } from "./env-cli-file.js";
import { validateSlug } from "./slug.js";

loadCliEnv();

function apiBase(): string {
  return (
    process.env.OPENCLAW_SOUL_API?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function openclawConfigPath(): string {
  return process.env.OPENCLAW_CONFIG || defaultOpenclawConfigPath();
}

async function renameBackupDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `${dir}.bak.${stamp}`;
  await fs.promises.rename(dir, backup);
  console.error(`Renamed existing directory to ${backup}`);
}

const program = new Command();
program.name("ocs").description("OpenClaw Soul — workspace pack CLI");

program
  .command("login")
  .description(
    "Sign in via browser (device flow); saves OPENCLAW_SOUL_TOKEN to .env.cli in monorepo root"
  )
  .option("--api <url>", "registry base URL", apiBase())
  .option("--force", "overwrite existing OPENCLAW_SOUL_TOKEN in .env.cli", false)
  .action(async (opts: { api: string; force: boolean }) => {
    const api = opts.api.replace(/\/$/, "");
    const token = await runDeviceLogin(api);
    const root = findMonorepoRoot();
    if (root) {
      upsertEnvCliLine({
        rootDir: root,
        key: "OPENCLAW_SOUL_TOKEN",
        value: token,
        force: opts.force,
      });
      setEnvCliLineIfMissing(root, "OPENCLAW_SOUL_API", api);
      console.error(`Updated ${path.join(root, ".env.cli")}`);
    } else {
      console.error(
        "Not inside openclaw-soul monorepo: set OPENCLAW_SOUL_TOKEN yourself."
      );
    }
    console.log(token);
  });

program
  .command("download")
  .description("Download a zip URL to a file")
  .argument("<url>", "https URL")
  .requiredOption("-o, --output <file>", "output path")
  .action(async (url: string, opts: { output: string }) => {
    await downloadToFile(url, opts.output);
    console.log(opts.output);
  });

program
  .command("apply")
  .description(
    "Download pack from registry by slug, extract to ~/.openclaw/workspace-<slug>, update openclaw.json"
  )
  .argument("<slug>", "pack slug on registry")
  .option("--api <url>", "registry base URL", apiBase())
  .option(
    "--config <path>",
    "path to openclaw.json",
    openclawConfigPath()
  )
  .action(async (slug: string, opts: { api: string; config: string }) => {
    validateSlug(slug);
    const base = opts.api.replace(/\/$/, "");
    const zipUrl = `${base}/api/packs/${encodeURIComponent(slug)}/download`;
    const tmpZip = path.join(
      os.tmpdir(),
      `openclaw-soul-${slug}-${Date.now()}.zip`
    );
    console.error(`Downloading ${zipUrl}`);
    await downloadToFile(zipUrl, tmpZip);
    const dest = path.join(os.homedir(), ".openclaw", `workspace-${slug}`);
    await renameBackupDir(dest);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await extractZip(tmpZip, dest);
    await fs.promises.unlink(tmpZip);
    backupAndWriteWorkspace(opts.config, dest);
    console.log(dest);
  });

program
  .command("publish")
  .description(
    "Zip a workspace and upload (needs token or run ocs login). Without --slug/--title, runs an interactive wizard in a TTY."
  )
  .option("--api <url>", "registry base URL", apiBase())
  .option("--token <token>", "API token (or OPENCLAW_SOUL_TOKEN)")
  .option("--slug <slug>", "unique slug for this pack")
  .option("--title <title>", "display title")
  .option("--summary <text>", "short description")
  .option(
    "--source <mode>",
    "pack from: current openclaw workspace, or a directory path",
    "current"
  )
  .option("--avatar <file>", "optional avatar image file")
  .option(
    "--config <path>",
    "path to openclaw.json (for --source current)",
    openclawConfigPath()
  )
  .action(
    async (opts: {
      api: string;
      token?: string;
      slug?: string;
      title?: string;
      summary?: string;
      source: string;
      avatar?: string;
      config: string;
    }) => {
      const api = opts.api.replace(/\/$/, "");
      let slug = (opts.slug ?? "").trim();
      let title = (opts.title ?? "").trim();
      let summary = opts.summary?.trim();
      let source = opts.source;
      let avatar = opts.avatar;
      const config = opts.config;

      const bothNames = slug.length > 0 && title.length > 0;
      if (!bothNames) {
        if (!process.stdin.isTTY) {
          throw new Error(
            "Non-interactive mode: provide both --slug and --title, or run from a terminal for the wizard."
          );
        }
        const w = await runPublishWizard({
          slug,
          title,
          summary,
          source,
          avatar,
        });
        slug = w.slug;
        title = w.title;
        summary = w.summary;
        source = w.source;
        avatar = w.avatar;
      }

      let token = opts.token || process.env.OPENCLAW_SOUL_TOKEN;
      if (!token) {
        if (!process.stdin.isTTY) {
          throw new Error(
            "Set OPENCLAW_SOUL_TOKEN, use --token, or run ocs login from a terminal."
          );
        }
        console.error("No API token; starting browser login…");
        token = await runDeviceLogin(api);
      }

      validateSlug(slug);

      let sourceDir: string;
      if (source === "current") {
        const w = readWorkspaceFromConfig(config);
        if (!w) throw new Error(`Could not read workspace from ${config}`);
        sourceDir = w;
      } else {
        sourceDir = resolveWorkspacePath(source);
      }
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source not found: ${sourceDir}`);
      }

      let avatarPath: string | undefined;
      if (avatar) {
        avatarPath = resolveWorkspacePath(avatar);
        if (!fs.existsSync(avatarPath)) {
          throw new Error(`Avatar not found: ${avatarPath}`);
        }
      }

      const text = await publishPack({
        apiBase: api,
        token,
        slug,
        title,
        summary,
        sourceDir,
        avatarPath,
      });
      console.log(text);
    }
  );

program
  .command("import")
  .description(
    "Copy files from a local pack directory (manifest.json + listed files) into a target workspace"
  )
  .argument("<packDir>", "directory containing manifest.json")
  .requiredOption("--target <dir>", "OpenClaw workspace directory to write into")
  .option("--dry-run", "print planned copies only", false)
  .action(
    (packDir: string, opts: { target: string; dryRun: boolean }) => {
      const absPack = resolveWorkspacePath(packDir);
      const absTarget = path.resolve(opts.target);
      importFromManifest(absPack, absTarget, opts.dryRun);
      if (!opts.dryRun) console.log(absTarget);
    }
  );

program
  .command("archive-directory")
  .description(
    "Rename a directory to <dir>.bak.<timestamp> (no rm). Use before manual merges."
  )
  .argument("<dir>", "directory to archive")
  .action(async (dir: string) => {
    const abs = path.resolve(dir);
    if (!fs.existsSync(abs)) throw new Error(`Not found: ${abs}`);
    const st = await fs.promises.stat(abs);
    if (!st.isDirectory()) throw new Error(`Not a directory: ${abs}`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = `${abs}.bak.${stamp}`;
    await fs.promises.rename(abs, backup);
    console.error(`Renamed to ${backup}`);
    console.log(backup);
  });

program
  .command("restore-openclaw-config")
  .description(
    "Restore openclaw.json from a .bak.* copy (backs up current first). Use --list or --latest or --from"
  )
  .option(
    "--config <path>",
    "path to openclaw.json",
    openclawConfigPath()
  )
  .option("--list", "list backup files for this config")
  .option("--latest", "restore from newest .bak.*")
  .option("--from <file>", "restore from a specific backup file")
  .action((opts: { config: string; list?: boolean; latest?: boolean; from?: string }) => {
    const p = opts.config;
    const dir = path.dirname(p);
    const base = path.basename(p);
    const prefix = `${base}.bak.`;
    if (!fs.existsSync(dir)) throw new Error(`Directory missing: ${dir}`);

    const backups = fs
      .readdirSync(dir)
      .filter((e) => e.startsWith(prefix))
      .map((e) => path.join(dir, e))
      .filter((f) => fs.statSync(f).isFile())
      .sort();

    if (opts.list) {
      for (const b of backups) console.log(b);
      return;
    }

    let fromFile: string | undefined = opts.from;
    if (opts.latest) {
      if (backups.length === 0) throw new Error("No backups found");
      fromFile = backups[backups.length - 1];
    }

    if (!fromFile) {
      throw new Error("Specify --list, --latest, or --from <file>");
    }

    if (!fs.existsSync(fromFile)) throw new Error(`Backup not found: ${fromFile}`);
    if (!fs.existsSync(p)) {
      fs.copyFileSync(fromFile, p);
      console.error(`Restored ${p} from ${fromFile} (no prior config to back up)`);
      console.log(p);
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const preRestore = `${p}.bak.pre-restore.${stamp}`;
    fs.copyFileSync(p, preRestore);
    fs.copyFileSync(fromFile, p);
    console.error(`Backed up current config to ${preRestore}`);
    console.error(`Restored ${p} from ${fromFile}`);
    console.log(p);
  });

program
  .command("backup-openclaw-config")
  .description("Copy openclaw.json to openclaw.json.bak.<timestamp> (no rm)")
  .option(
    "--config <path>",
    "path to openclaw.json",
    openclawConfigPath()
  )
  .action((opts: { config: string }) => {
    const p = opts.config;
    if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${p}.bak.${stamp}`;
    fs.copyFileSync(p, bak);
    console.log(bak);
  });

program.parse();
