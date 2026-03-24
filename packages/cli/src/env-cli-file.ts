import fs from "node:fs";
import path from "node:path";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function upsertEnvKeyInFile(opts: {
  filePath: string;
  key: string;
  value: string;
  force: boolean;
}): void {
  const { filePath, key, value, force } = opts;
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }
  const re = new RegExp(`^${escapeRe(key)}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(content)) {
    if (!force) {
      throw new Error(
        `${key} already set in ${filePath}; use ocs login --force to overwrite`
      );
    }
    content = content.replace(re, line);
  } else {
    const needNl = content.length > 0 && !content.endsWith("\n");
    content = `${content}${needNl ? "\n" : ""}${line}\n`;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

export function setEnvKeyIfMissing(
  filePath: string,
  key: string,
  value: string
): void {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }
  const re = new RegExp(`^${escapeRe(key)}=.*$`, "m");
  if (re.test(content)) return;
  const needNl = content.length > 0 && !content.endsWith("\n");
  content = `${content}${needNl ? "\n" : ""}${key}=${value}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
