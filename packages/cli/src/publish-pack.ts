import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import FormDataNode from "form-data";
import {
  isConnectTimeoutError,
  isTransientNetworkError,
  requestPostRegistry,
} from "./fetch-registry.js";
import { zipDirectory } from "./zip-utils.js";
import { MAX_AVATAR_BYTES, MAX_PACK_ZIP_BYTES } from "./upload-limits.js";

function parseApiError(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: string };
    if (typeof j.error === "string") return j.error;
  } catch {
    /* ignore */
  }
  return text;
}

export type PublishPackInput = {
  apiBase: string;
  token: string;
  slug: string;
  title: string;
  summary?: string;
  sourceDir: string;
  avatarPath?: string;
  /** Same author + slug already exists: overwrite zip / metadata (URL unchanged). */
  replace?: boolean;
};

/** Successful JSON body from POST /api/packs */
export type PublishPackResult = {
  ok: true;
  handle: string;
  slug: string;
  downloadPath: string;
  viewPath: string;
  /** 服务端按 OPENCLAW_SOUL_SITE_URL / 请求头给出的对外完整链接 */
  viewUrl?: string;
};

/** Bearer rejected (expired, revoked, or DB reset). Caller may prompt re-login. */
export class PublishAuthError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`Publish auth failed: ${status} ${body}`);
    this.name = "PublishAuthError";
    this.status = status;
    this.body = body;
  }
}

/** Slug already taken for this account; retry with replace or pick another slug. */
export class PublishConflictError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string) {
    super(`Publish conflict: ${status} ${body}`);
    this.name = "PublishConflictError";
    this.status = status;
    this.body = body;
  }
}

export async function publishPack(
  input: PublishPackInput
): Promise<PublishPackResult> {
  const tmpZip = path.join(
    os.tmpdir(),
    `openclaw-soul-publish-${Date.now()}.zip`
  );
  console.error(
    `正在打包：${input.sourceDir}（临时 zip 在系统临时目录，上传后删除）`
  );
  await zipDirectory(input.sourceDir, tmpZip);
  try {
    const zipStat = await fs.promises.stat(tmpZip);
    if (zipStat.size > MAX_PACK_ZIP_BYTES) {
      throw new Error(
        `打包结果超过 ${MAX_PACK_ZIP_BYTES} 字节（2 MiB）上限，请减小工作区后再试。`
      );
    }
    if (input.avatarPath) {
      const avStat = await fs.promises.stat(input.avatarPath);
      if (avStat.size > MAX_AVATAR_BYTES) {
        throw new Error(
          `头像超过 ${MAX_AVATAR_BYTES} 字节（512 KiB）上限。`
        );
      }
    }
    const zipBuf = await fs.promises.readFile(tmpZip);
    const base = input.apiBase.replace(/\/$/, "");
    /**
     * npm `form-data` + `getBuffer()`，上传用 `requestPostRegistry`（undici `request` + Buffer），
     * 不经 Web `fetch`，避免 Node 22 + undici 下 multipart 仍触发 `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH`。
     */
    const form = new FormDataNode();
    form.append("slug", input.slug);
    form.append("title", input.title);
    if (input.summary) form.append("summary", input.summary);
    form.append("zip", zipBuf, {
      filename: "pack.zip",
      contentType: "application/zip",
    });
    if (input.avatarPath) {
      const ab = await fs.promises.readFile(input.avatarPath);
      const name = path.basename(input.avatarPath);
      form.append("avatar", ab, {
        filename: name,
        contentType: "application/octet-stream",
      });
    }
    if (input.replace) {
      form.append("replace", "true");
    }

    const multipartBody = form.getBuffer();
    const formHeaders = form.getHeaders() as Record<string, string>;
    const multipartType = formHeaders["content-type"];
    if (!multipartType || typeof multipartType !== "string") {
      throw new Error("form-data 未提供 content-type（multipart boundary）");
    }
    let statusCode: number;
    let responseText: string;
    try {
      const out = await requestPostRegistry(`${base}/api/packs`, {
        body: Buffer.from(multipartBody),
        headers: {
          "content-type": multipartType,
          authorization: `Bearer ${input.token}`,
        },
      });
      statusCode = out.statusCode;
      responseText = out.text;
    } catch (e) {
      if (isConnectTimeoutError(e)) {
        throw new Error(
          `连接 registry 超时（${base}）。可调大 OPENCLAW_SOUL_CONNECT_TIMEOUT_MS（默认 60000）、` +
            `OPENCLAW_SOUL_BODY_TIMEOUT_MS（大 zip 上传，默认 300000）；从国内访问若仍失败请检查网络或设置 HTTPS_PROXY。`
        );
      }
      if (isTransientNetworkError(e)) {
        throw new Error(
          `上传过程中网络中断（${base}，如 ECONNRESET）。CLI 已自动重试仍失败时可：增大 OPENCLAW_SOUL_FETCH_MAX_RETRIES（默认 3）、` +
            `检查 Wi‑Fi/运营商；若浏览器走系统代理，请在同一终端设置 HTTPS_PROXY=http://127.0.0.1:端口 后再执行 publish。`
        );
      }
      throw e;
    }
    if (statusCode < 200 || statusCode >= 300) {
      if (statusCode === 401) {
        throw new PublishAuthError(statusCode, responseText);
      }
      if (statusCode === 409) {
        throw new PublishConflictError(statusCode, responseText);
      }
      if (statusCode === 413) {
        const detail = parseApiError(responseText);
        throw new Error(
          `上传被拒绝（体积超限）：${detail}（pack zip ≤ 2 MiB，头像 ≤ 512 KiB）`
        );
      }
      if (statusCode === 429) {
        const detail = parseApiError(responseText);
        throw new Error(
          `发布过于频繁（429），请稍后再试。${detail}`
        );
      }
      if (statusCode >= 500) {
        const detail = parseApiError(responseText);
        throw new Error(
          `registry 服务端错误（${statusCode}）：${detail}（请到 Vercel 该次部署的 Logs 查看堆栈，常见：数据库、BLOB_READ_WRITE_TOKEN、Prisma migrate）`
        );
      }
      throw new Error(`Publish failed: ${statusCode} ${responseText}`);
    }
    let body: unknown;
    try {
      body = JSON.parse(responseText) as unknown;
    } catch {
      throw new Error(`Publish: expected JSON response, got: ${responseText}`);
    }
    if (
      typeof body !== "object" ||
      body === null ||
      (body as { ok?: unknown }).ok !== true ||
      typeof (body as { handle?: unknown }).handle !== "string" ||
      typeof (body as { slug?: unknown }).slug !== "string" ||
      typeof (body as { downloadPath?: unknown }).downloadPath !== "string" ||
      typeof (body as { viewPath?: unknown }).viewPath !== "string"
    ) {
      throw new Error(`Publish: unexpected response: ${responseText}`);
    }
    const parsed = body as PublishPackResult;
    if (
      parsed.viewUrl !== undefined &&
      typeof parsed.viewUrl !== "string"
    ) {
      throw new Error(`Publish: unexpected response: ${responseText}`);
    }
    return parsed;
  } finally {
    await fs.promises.unlink(tmpZip).catch(() => {});
  }
}
