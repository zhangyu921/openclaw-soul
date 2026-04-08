import { describe, expect, it } from "vitest";
import { readZipFilesAsMap } from "@/lib/pack-source-ingest";
import { buildEmptyZipBuffer } from "@/lib/pack-source-zip";

describe("buildEmptyZipBuffer", () => {
  it("yields zip readable as zero entries", async () => {
    const buf = await buildEmptyZipBuffer();
    const m = await readZipFilesAsMap(buf);
    expect(m.size).toBe(0);
  });
});
