import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { zipDirectory } from "./zip-utils.js";

export type PublishPackInput = {
  apiBase: string;
  token: string;
  slug: string;
  title: string;
  summary?: string;
  sourceDir: string;
  avatarPath?: string;
};

/** Successful JSON body from POST /api/packs */
export type PublishPackResult = {
  ok: true;
  slug: string;
  downloadPath: string;
};

export async function publishPack(
  input: PublishPackInput
): Promise<PublishPackResult> {
  const tmpZip = path.join(
    os.tmpdir(),
    `openclaw-soul-publish-${Date.now()}.zip`
  );
  console.error(`Zipping ${input.sourceDir} → ${tmpZip}`);
  await zipDirectory(input.sourceDir, tmpZip);
  try {
    const zipBuf = await fs.promises.readFile(tmpZip);
    const base = input.apiBase.replace(/\/$/, "");
    const form = new FormData();
    form.append("slug", input.slug);
    form.append("title", input.title);
    if (input.summary) form.append("summary", input.summary);
    form.append(
      "zip",
      new File([zipBuf], "pack.zip", { type: "application/zip" })
    );
    if (input.avatarPath) {
      const ab = await fs.promises.readFile(input.avatarPath);
      const name = path.basename(input.avatarPath);
      form.append(
        "avatar",
        new File([ab], name, { type: "application/octet-stream" })
      );
    }

    const res = await fetch(`${base}/api/packs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}` },
      body: form,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Publish failed: ${res.status} ${text}`);
    }
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Publish: expected JSON response, got: ${text}`);
    }
    if (
      typeof body !== "object" ||
      body === null ||
      (body as { ok?: unknown }).ok !== true ||
      typeof (body as { slug?: unknown }).slug !== "string" ||
      typeof (body as { downloadPath?: unknown }).downloadPath !== "string"
    ) {
      throw new Error(`Publish: unexpected response: ${text}`);
    }
    return body as PublishPackResult;
  } finally {
    await fs.promises.unlink(tmpZip).catch(() => {});
  }
}
