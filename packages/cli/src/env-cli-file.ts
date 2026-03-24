import fs from "node:fs";
import path from "node:path";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function upsertEnvCliLine(opts: {
  rootDir: string;
  key: string;
  value: string;
  force: boolean;
}): void {
  const filePath = path.join(opts.rootDir, ".env.cli");
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }
  const re = new RegExp(`^${escapeRe(opts.key)}=.*$`, "m");
  const line = `${opts.key}=${opts.value}`;
  if (re.test(content)) {
    if (!opts.force) {
      throw new Error(
        `${opts.key} already set in .env.cli; use --force to overwrite`
      );
    }
    content = content.replace(re, line);
  } else {
    const needNl = content.length > 0 && !content.endsWith("\n");
    content = `${content}${needNl ? "\n" : ""}${line}\n`;
  }
  fs.writeFileSync(filePath, content, "utf8");
}

export function setEnvCliLineIfMissing(
  rootDir: string,
  key: string,
  value: string
): void {
  const filePath = path.join(rootDir, ".env.cli");
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }
  const re = new RegExp(`^${escapeRe(key)}=.*$`, "m");
  if (re.test(content)) return;
  const needNl = content.length > 0 && !content.endsWith("\n");
  content = `${content}${needNl ? "\n" : ""}${key}=${value}\n`;
  fs.writeFileSync(filePath, content, "utf8");
}
