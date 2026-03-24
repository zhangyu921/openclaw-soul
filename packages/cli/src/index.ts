#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { Command } from "commander";
import { loadCliEnv, resolveWorkspacePath } from "./load-env.js";

loadCliEnv();
import {
  backupAndWriteWorkspace,
  defaultOpenclawConfigPath,
  readWorkspaceFromConfig,
} from "./openclaw-config.js";
import { downloadToFile, extractZip, zipDirectory } from "./zip-utils.js";
import { importFromManifest } from "./import-pack.js";

function apiBase(): string {
  return (
    process.env.OPENCLAW_SOUL_API?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function openclawConfigPath(): string {
  return process.env.OPENCLAW_CONFIG || defaultOpenclawConfigPath();
}

function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "slug must be lowercase letters, digits, and hyphens (e.g. workspace-asuka)"
    );
  }
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
  .description("Zip a workspace directory and upload to registry (needs API token)")
  .option("--api <url>", "registry base URL", apiBase())
  .option("--token <token>", "API token (or set OPENCLAW_SOUL_TOKEN)")
  .requiredOption("--slug <slug>", "unique slug for this pack")
  .requiredOption("--title <title>", "display title")
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
      slug: string;
      title: string;
      summary?: string;
      source: string;
      avatar?: string;
      config: string;
    }) => {
      validateSlug(opts.slug);
      const token = opts.token || process.env.OPENCLAW_SOUL_TOKEN;
      if (!token) throw new Error("Set --token or OPENCLAW_SOUL_TOKEN");

      let sourceDir: string;
      if (opts.source === "current") {
        const w = readWorkspaceFromConfig(opts.config);
        if (!w) throw new Error(`Could not read workspace from ${opts.config}`);
        sourceDir = w;
      } else {
        sourceDir = resolveWorkspacePath(opts.source);
      }
      if (!fs.existsSync(sourceDir)) throw new Error(`Source not found: ${sourceDir}`);

      const tmpZip = path.join(
        os.tmpdir(),
        `openclaw-soul-publish-${Date.now()}.zip`
      );
      console.error(`Zipping ${sourceDir} → ${tmpZip}`);
      await zipDirectory(sourceDir, tmpZip);
      const zipBuf = await fs.promises.readFile(tmpZip);

      const base = opts.api.replace(/\/$/, "");
      const form = new FormData();
      form.append("slug", opts.slug);
      form.append("title", opts.title);
      if (opts.summary) form.append("summary", opts.summary);
      form.append(
        "zip",
        new File([zipBuf], "pack.zip", { type: "application/zip" })
      );
      if (opts.avatar) {
        const ab = await fs.promises.readFile(opts.avatar);
        const name = path.basename(opts.avatar);
        form.append(
          "avatar",
          new File([ab], name, { type: "application/octet-stream" })
        );
      }

      const res = await fetch(`${base}/api/packs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      await fs.promises.unlink(tmpZip);
      const text = await res.text();
      if (!res.ok) throw new Error(`Publish failed: ${res.status} ${text}`);
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
