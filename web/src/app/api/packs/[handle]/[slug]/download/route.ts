import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { storageRoot } from "@/lib/storage";

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug);
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const abs = path.join(storageRoot(), pack.zipRelPath);
  try {
    const buf = await fs.readFile(abs);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
}
