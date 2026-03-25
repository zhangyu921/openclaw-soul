import fs from "node:fs";
import path from "node:path";
import { confirm } from "@inquirer/prompts";
import { getOpenclawSoulConfigDir } from "./user-config-path.js";

export const PRIVACY_ACK_VERSION = "v1";

export function getPrivacyAckFilePath(): string {
  return path.join(getOpenclawSoulConfigDir(), "privacy-ack");
}

export function readPrivacyAckVersion(): string | null {
  const p = getPrivacyAckFilePath();
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8").trim();
  const nl = raw.indexOf("\n");
  const line = nl === -1 ? raw : raw.slice(0, nl);
  return line || null;
}

export function writePrivacyAck(): void {
  const p = getPrivacyAckFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${PRIVACY_ACK_VERSION}\n`, "utf8");
}

export async function ensurePublishPrivacyConsent(opts: {
  apiBase: string;
  acceptPrivacyFlag: boolean;
}): Promise<void> {
  if (opts.acceptPrivacyFlag) return;
  if (process.env.OPENCLAW_SOUL_ACCEPT_PRIVACY === "1") return;
  if (readPrivacyAckVersion() === PRIVACY_ACK_VERSION) return;

  const base = opts.apiBase.replace(/\/$/, "");
  const url = `${base}/privacy`;

  if (!process.stdin.isTTY) {
    throw new Error(
      `非交互 publish 须确认隐私条款：请使用 --accept-privacy，或设置 OPENCLAW_SOUL_ACCEPT_PRIVACY=1。全文：${url}`
    );
  }

  const ok = await confirm({
    message: `上传将打包整个工作区（可能含 MEMORY、密钥等）。确认你已阅读并同意 ${url} 中的说明，并自行承担内容责任？`,
    default: false,
  });
  if (!ok) {
    throw new Error("已取消。阅读 /privacy 后可重试，或使用 --accept-privacy。");
  }
  writePrivacyAck();
}
