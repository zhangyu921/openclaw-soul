#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import {
  loadCliEnv,
  resolveWorkspacePath,
  resolveDefaultApiBase,
} from "./load-env.js";
import {
  backupAndWriteWorkspace,
  defaultOpenclawConfigPath,
  readWorkspaceFromConfig,
} from "./openclaw-config.js";
import {
  assertSafeRootRelativeFile,
  downloadToFile,
  extractZip,
} from "./zip-utils.js";
import {
  publishPack,
  PublishAuthError,
  PublishConflictError,
} from "./publish-pack.js";
import { runPublishWizard } from "./publish-wizard.js";
import { runDeviceLogin } from "./device-login.js";
import { upsertEnvKeyInFile, setEnvKeyIfMissing } from "./env-cli-file.js";
import { getUserEnvFilePath } from "./user-config-path.js";
import { validateSlug } from "./slug.js";
import { readIdentityDefaults } from "./read-identity.js";
import { ensurePublishPrivacyConsent } from "./privacy-ack.js";
import { dbg, setCliDebug } from "./cli-debug.js";
import { fetchPackVisibility } from "./registry-pack-meta.js";

loadCliEnv();

function apiBase(): string {
  return resolveDefaultApiBase();
}

function openclawConfigPath(): string {
  return process.env.OPENCLAW_CONFIG || defaultOpenclawConfigPath();
}

/** Write token (and API base if missing) to user config `env` (production path). */
function persistOpenclawSoulCredentials(
  api: string,
  token: string,
  forceToken: boolean
): void {
  const filePath = getUserEnvFilePath();
  upsertEnvKeyInFile({
    filePath,
    key: "OPENCLAW_SOUL_TOKEN",
    value: token,
    force: forceToken,
  });
  setEnvKeyIfMissing(filePath, "OPENCLAW_SOUL_API", api);
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      /* ignore */
    }
  }
  console.error(`已写入 ${filePath}，后续命令会自动使用该 token。`);
}

/**
 * Rename `dir` to `dir.bak.<stamp>` if it exists.
 * Pass the same `stamp` as the config backup so both paths are predictable.
 */
async function renameBackupDir(
  dir: string,
  debug: boolean,
  stamp: string
): Promise<{ renamed: boolean; backupPath?: string }> {
  if (!fs.existsSync(dir)) return { renamed: false };
  const backup = `${dir}.bak.${stamp}`;
  await fs.promises.rename(dir, backup);
  if (debug) {
    console.error(`Renamed existing directory to ${backup}`);
  }
  return { renamed: true, backupPath: backup };
}

const program = new Command();
program
  .name("ocs")
  .description(
    "OpenClaw Soul — workspace pack CLI\n\n" +
      "主流程：login（registry 登录）→ publish（打包上传）→ apply（从 registry 安装到本机）。\n" +
      "工具：archive-directory / backup-openclaw-config / restore-openclaw-config（备份与恢复，不删文件）。"
  )
  .configureHelp({ sortSubcommands: true });

program
  .command("login")
  .description(
    "浏览器 device flow 登录；将 OPENCLAW_SOUL_TOKEN 写入用户 env 文件（见 README Credentials）"
  )
  .option("--api <url>", "registry base URL", apiBase())
  .option(
    "--force",
    "overwrite existing OPENCLAW_SOUL_TOKEN in user config env file",
    false
  )
  .action(async (opts: { api: string; force: boolean }) => {
    const api = opts.api.replace(/\/$/, "");
    const token = await runDeviceLogin(api);
    persistOpenclawSoulCredentials(api, token, opts.force);
    console.log(token);
  });

program
  .command("apply")
  .description(
    "从 registry 下载 zip 并解压到 ~/.openclaw/workspace-<slug>，写入 agents.defaults.workspace（已有目录/配置会先备份为 .bak.*）"
  )
  .argument("<ref>", "handle/slug (e.g. alice/my-persona)")
  .option("--api <url>", "registry base URL", apiBase())
  .option(
    "--config <path>",
    "path to openclaw.json",
    openclawConfigPath()
  )
  .option("--debug", "print full URLs, backup paths, and openclaw.json notes", false)
  .option("-y, --yes", "skip confirmation prompt (TTY only)", false)
  .option("--token <token>", "API token for unlisted packs (or OPENCLAW_SOUL_TOKEN)")
  .action(
    async (
      ref: string,
      opts: {
        api: string;
        config: string;
        debug: boolean;
        yes: boolean;
        token?: string;
      }
    ) => {
    const debug = Boolean(opts.debug);
    setCliDebug(debug);
    try {
      const parts = ref.split("/").filter(Boolean);
      if (parts.length !== 2) {
        throw new Error(
          `Expected handle/slug (e.g. alice/my-pack), got: ${ref}`
        );
      }
      const [handle, slug] = parts;
      validateSlug(handle);
      validateSlug(slug);
      const base = opts.api.replace(/\/$/, "");
      const encH = encodeURIComponent(handle);
      const encS = encodeURIComponent(slug);
      const zipUrl = `${base}/api/packs/${encH}/${encS}/download`;
      const token = opts.token?.trim() || process.env.OPENCLAW_SOUL_TOKEN?.trim();
      const meta = await fetchPackVisibility(base, handle, slug, token);
      if (!meta) {
        throw new Error(
          `找不到 pack ${handle}/${slug}，或该 pack 未公开（需设置 OPENCLAW_SOUL_TOKEN / --token 作为作者）`
        );
      }
      const dest = path.join(os.homedir(), ".openclaw", `workspace-${slug}`);
      const configAbs = path.resolve(opts.config);
      const opStamp = new Date().toISOString().replace(/[:.]/g, "-");
      const workspaceBackupPlanned =
        fs.existsSync(dest) ? `${dest}.bak.${opStamp}` : null;
      const configBackupPlanned = fs.existsSync(configAbs)
        ? `${configAbs}.bak.${opStamp}`
        : null;

      if (process.stdin.isTTY && !opts.yes) {
        if (meta.visibility === "UNLISTED") {
          console.error(
            "当前 pack 为草稿（未在画廊公开）；将使用你的 token 作为作者下载。"
          );
        }
        console.error("即将执行 apply，请确认：");
        console.error(`  Registry：${base}`);
        console.error(`  Pack：${handle}/${slug}`);
        console.error(`  下载地址：${zipUrl}`);
        console.error(`  解压到：${dest}`);
        if (workspaceBackupPlanned) {
          console.error(`  已存在的工作区目录将改名为：${workspaceBackupPlanned}`);
        } else {
          console.error(`  工作区目录尚不存在，将新建：${dest}`);
        }
        console.error(`  配置文件：${configAbs}`);
        if (configBackupPlanned) {
          console.error(`  若配置文件已存在，将先备份为：${configBackupPlanned}`);
        }
        console.error(
          `  随后写入 agents.defaults.workspace → ${dest}`
        );
        const ok = await confirm({ message: "是否继续？", default: true });
        if (!ok) {
          throw new Error("已取消 apply。");
        }
      }

      const tmpZip = path.join(
        os.tmpdir(),
        `openclaw-soul-${handle}-${slug}-${Date.now()}.zip`
      );
      if (debug) {
        console.error(`Downloading ${zipUrl}`);
      } else {
        console.error(`正在下载并解压 ${handle}/${slug} …`);
      }
      if (meta.visibility === "UNLISTED") {
        if (!token) {
          throw new Error(
            "未公开 pack 需要 OPENCLAW_SOUL_TOKEN 或 --token（作者）"
          );
        }
        await downloadToFile(zipUrl, tmpZip, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await downloadToFile(zipUrl, tmpZip);
      }
      dbg(`Saved zip to ${tmpZip}`);

      const wsBackup = await renameBackupDir(dest, debug, opStamp);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await extractZip(tmpZip, dest);
      await fs.promises.unlink(tmpZip);
      dbg(`Removed temp zip ${tmpZip}`);
      const { configBackupPath } = backupAndWriteWorkspace(opts.config, dest, {
        debug,
        backupStamp: opStamp,
      });
      if (!debug) {
        console.error(`完成：${handle}/${slug}`);
        if (wsBackup.renamed && wsBackup.backupPath) {
          console.error(`原工作区已备份：${wsBackup.backupPath}`);
        }
        if (configBackupPath) {
          console.error(`openclaw.json 已备份：${configBackupPath}`);
        }
        console.error(`openclaw.json 已更新：${configAbs}`);
        console.error(
          `已指向工作区：${dest}（agents.defaults.workspace）`
        );
        console.error("stdout 仅输出工作区绝对路径一行，供脚本使用。");
      } else {
        console.error(
          "完成。工作区路径见 stdout；配置与备份路径见上方 debug 输出。"
        );
      }
      console.log(dest);
    } finally {
      setCliDebug(false);
    }
  }
  );

program
  .command("publish")
  .description(
    "将 workspace 打成 zip 并上传（需 token 或先 login）。默认只含根目录 SOUL.md+MEMORY.md；--full 整目录；--include 追加根文件。无 --slug 时走交互向导"
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
    "--replace",
    "if you already have a pack with this slug, overwrite zip/title/summary (URL unchanged; avatar only updated if --avatar is set)",
    false
  )
  .option(
    "--public",
    "list pack on gallery immediately (default: unlisted draft)",
    false
  )
  .option(
    "--accept-privacy",
    "acknowledge privacy & upload terms (required for non-TTY publish; see /privacy on the registry)",
    false
  )
  .option(
    "--config <path>",
    "path to openclaw.json (for --source current)",
    openclawConfigPath()
  )
  .option(
    "--full",
    "zip entire workspace directory (all files and subfolders; legacy behavior)",
    false
  )
  .option(
    "--include <file>",
    "include an extra workspace root file (repeatable); only used when not using --full",
    (value: string, prev: string[]) => [...prev, value],
    [] as string[]
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
      replace: boolean;
      public: boolean;
      acceptPrivacy: boolean;
      config: string;
      full: boolean;
      include: string[];
    }) => {
      const api = opts.api.replace(/\/$/, "");
      const config = opts.config;
      let replace = Boolean(opts.replace);

      let token = opts.token || process.env.OPENCLAW_SOUL_TOKEN;
      if (!token) {
        if (!process.stdin.isTTY) {
          throw new Error(
            "Set OPENCLAW_SOUL_TOKEN, use --token, or run ocs login from a terminal."
          );
        }
        const proceed = await confirm({
          message:
            "未检测到 API token（尚未登录 registry）。是否在浏览器中登录并授权 CLI？（若 OPENCLAW_SOUL_API 指向本地，请先启动 web 并在仓库根配置 `.env.cli`）",
          default: true,
        });
        if (!proceed) {
          throw new Error(
            "已取消。可执行 `npm run ocs -- login` 单独登录，或在用户配置 env 文件 / 仓库 `.env.cli` / 环境变量中设置 OPENCLAW_SOUL_TOKEN 后再 publish。"
          );
        }
        token = await runDeviceLogin(api);
        persistOpenclawSoulCredentials(api, token, true);
      }

      let slug = (opts.slug ?? "").trim();
      let title = (opts.title ?? "").trim();
      let summary = opts.summary?.trim();
      let source = opts.source;
      let avatar = opts.avatar;
      let wizardFullZip: boolean | undefined;
      let wizardRootFiles: string[] | undefined;

      if (slug && !title) {
        let sourceDir: string | null = null;
        if (source === "current") {
          sourceDir = readWorkspaceFromConfig(config);
        } else {
          const p = resolveWorkspacePath(source);
          if (fs.existsSync(p)) sourceDir = p;
        }
        if (sourceDir) {
          const id = readIdentityDefaults(sourceDir);
          if (id) title = id.displayName;
        }
        if (!title) title = slug;
      }

      if (!slug) {
        if (!process.stdin.isTTY) {
          throw new Error(
            "Non-interactive mode: provide --slug, or run from a terminal for the wizard."
          );
        }
        const w = await runPublishWizard({
          configPath: config,
          slug,
          title,
          summary,
          source,
          avatar,
          skipPackRootPrompt: Boolean(opts.full),
        });
        slug = w.slug;
        title = w.title;
        summary = w.summary;
        source = w.source;
        avatar = w.avatar;
        wizardFullZip = w.fullZip;
        wizardRootFiles = w.selectedRootFiles;
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

      await ensurePublishPrivacyConsent({
        apiBase: api,
        acceptPrivacyFlag: Boolean(opts.acceptPrivacy),
      });

      const packFull = Boolean(opts.full) || wizardFullZip === true;
      const includeList = opts.include ?? [];
      if (packFull && includeList.length > 0) {
        console.error("提示：已使用 --full / 整目录打包，忽略 --include。");
      }

      let subsetFiles: string[] | undefined;
      if (!packFull) {
        if (wizardRootFiles !== undefined) {
          subsetFiles = wizardRootFiles;
        } else {
          const extra = includeList.map((f) =>
            assertSafeRootRelativeFile(sourceDir, f)
          );
          subsetFiles = [...new Set(["SOUL.md", "MEMORY.md", ...extra])];
        }
      }

      let packVisibility: "UNLISTED" | "LISTED" | undefined;
      if (replace && !opts.public) {
        packVisibility = undefined;
      } else if (opts.public) {
        packVisibility = "LISTED";
      } else {
        packVisibility = "UNLISTED";
      }

      const maxReauthAttempts = 1;
      for (let authAttempt = 0; ; authAttempt++) {
        try {
          const result = await publishPack({
            apiBase: api,
            token,
            slug,
            title,
            summary,
            sourceDir,
            avatarPath,
            replace,
            fullZip: packFull,
            subsetFiles,
            visibility: packVisibility,
          });
          const viewUrl = result.viewUrl ?? `${api}${result.viewPath}`;
          console.error(`上传成功。在浏览器中查看：${viewUrl}`);
          if (result.visibility === "UNLISTED" && process.stdin.isTTY) {
            console.error(
              "提示：当前为草稿（未在画廊公开）。公开请使用 `--public` 或在网站「上架到画廊」。"
            );
          }
          break;
        } catch (e) {
          if (e instanceof PublishConflictError) {
            if (replace) {
              throw new Error(`上传失败（已请求覆盖仍冲突）：${e.body}`);
            }
            if (!process.stdin.isTTY) {
              throw new Error(
                "该 slug 下你已有一个 pack。请加 `--replace` 覆盖上传，或换一个 `--slug`。"
              );
            }
            const ok = await confirm({
              message:
                "你已用该 slug 发布过 pack。是否覆盖更新（ZIP、标题与摘要会替换；未传 --avatar 时保留原头像；页面链接不变）？",
              default: true,
            });
            if (!ok) {
              throw new Error(
                "已取消。可换一个 slug，或执行 `ocs publish --replace`（可加 `--slug`）覆盖上传。"
              );
            }
            replace = true;
            continue;
          }
          if (
            e instanceof PublishAuthError &&
            authAttempt < maxReauthAttempts
          ) {
            if (!process.stdin.isTTY) {
              throw new Error(
                "上传失败：API token 无效或已过期（例如服务端数据库已重置）。请在终端执行 `ocs login --force`，或设置有效的 OPENCLAW_SOUL_TOKEN / --token 后重试。"
              );
            }
            const proceed = await confirm({
              message:
                "API token 无效或已过期（常见于服务端重置数据库或 token 被撤销）。是否在浏览器中重新登录并再次上传？",
              default: true,
            });
            if (!proceed) {
              throw new Error(
                "已取消。可执行 `ocs login --force` 写入新 token，或更新 OPENCLAW_SOUL_TOKEN / --token 后再执行 publish。"
              );
            }
            token = await runDeviceLogin(api);
            persistOpenclawSoulCredentials(api, token, true);
            continue;
          }
          throw e;
        }
      }
    }
  );

program
  .command("archive-directory")
  .description(
    "将目录改名为 <dir>.bak.<时间戳>（仅 rename，不删除），便于手动整理或合并前留档"
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
    "从 openclaw.json.bak.* 恢复配置（恢复前会先备份当前文件）。--list / --latest / --from"
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
  .description("将 openclaw.json 复制为同目录 .bak.<时间戳>（仅复制，不删除）")
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

// No subcommand: show help on stdout (not stderr), exit 0 — avoids red "error" styling in terminals.
const argv = process.argv.slice(2).filter((a) => a !== "-h" && a !== "--help");
if (argv.length === 0) {
  program.outputHelp({ error: false });
  process.exit(0);
}

program.parse();
