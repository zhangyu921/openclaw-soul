import { describe, expect, it } from "vitest";
import yazl from "yazl";
import {
  filterPackZipEntryPath,
  readZipFilesAsMap,
} from "@/lib/pack-source-ingest";

function buildZip(entries: { path: string; buf: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const z = new yazl.ZipFile();
    for (const e of entries) {
      z.addBuffer(e.buf, e.path);
    }
    const chunks: Buffer[] = [];
    z.outputStream.on("data", (c: Buffer) => chunks.push(c));
    z.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    z.outputStream.on("error", reject);
    z.end();
  });
}

describe("filterPackZipEntryPath", () => {
  it("skips mac junk", () => {
    expect(filterPackZipEntryPath("__MACOSX/foo")).toBeNull();
    expect(filterPackZipEntryPath(".DS_Store")).toBeNull();
  });
});

describe("readZipFilesAsMap", () => {
  it("reads md and binary paths", async () => {
    const zipBuf = await buildZip([
      { path: "SOUL.md", buf: Buffer.from("# hi") },
      { path: "sub/x.png", buf: Buffer.from([1, 2, 3]) },
    ]);
    const m = await readZipFilesAsMap(zipBuf);
    expect(m.get("SOUL.md")?.toString()).toBe("# hi");
    expect(m.get("sub/x.png")?.equals(Buffer.from([1, 2, 3]))).toBe(true);
  });
});
