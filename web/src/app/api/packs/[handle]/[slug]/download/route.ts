import { NextResponse } from "next/server";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readStoredFile } from "@/lib/storage";

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug);
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  try {
    const buf = await readStoredFile(pack.zipRelPath);
    return new NextResponse(new Uint8Array(buf), {
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
