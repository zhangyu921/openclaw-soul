import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buffer } from "node:stream/consumers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import yazl from "yazl";
import { downloadToFile, extractZip } from "../src/zip-utils.ts";

/** 同进程调用 downloadToFile，避免子进程里 loadCliEnv / 代理与 vitest 环境差异导致 60s 超时 */
describe("downloadToFile", () => {
  let proxyKeys: string[];
  let saved: Record<string, string | undefined>;
  let prevNoProxy: string | undefined;

  beforeEach(() => {
    prevNoProxy = process.env.NO_PROXY;
    proxyKeys = [
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "http_proxy",
      "https_proxy",
      "ALL_PROXY",
      "all_proxy",
    ];
    saved = {};
    for (const k of proxyKeys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    process.env.NO_PROXY = "*";
  });

  afterEach(() => {
    for (const k of proxyKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    if (prevNoProxy === undefined) delete process.env.NO_PROXY;
    else process.env.NO_PROXY = prevNoProxy;
  });

  it("writes response body to a file (localhost HTTP)", async () => {
    const payload = Buffer.from("zip-bytes");
    const server = createServer((req, res) => {
      if (req.url === "/pack.zip") {
        res.writeHead(200);
        res.end(payload);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const dir = mkdtempSync(join(tmpdir(), "ocs-dl-"));
    const out = join(dir, "out.zip");
    try {
      await downloadToFile(`http://127.0.0.1:${port}/pack.zip`, out);
      expect(readFileSync(out)).toEqual(payload);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("extractZip", () => {
  it("extracts entries to a directory", async () => {
    const zip = new yazl.ZipFile();
    zip.addBuffer(Buffer.from("hello"), "SOUL.md");
    const zipPromise = buffer(zip.outputStream);
    zip.end();
    const zipBuf = await zipPromise;
    const dir = mkdtempSync(join(tmpdir(), "ocs-ex-"));
    const zipPath = join(dir, "p.zip");
    const dest = join(dir, "dest");
    try {
      writeFileSync(zipPath, zipBuf);
      await extractZip(zipPath, dest);
      expect(readFileSync(join(dest, "SOUL.md"), "utf8")).toBe("hello");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
