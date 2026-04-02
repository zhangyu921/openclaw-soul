import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { findUserIdByApiToken } from "@/lib/token-api";
import { readStoredFile } from "@/lib/storage";

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, {
    allowUnlisted: true,
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (pack.visibility === PackVisibility.UNLISTED) {
    const auth = req.headers.get("authorization");
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const plain = m?.[1]?.trim();
    if (!plain) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const userId = await findUserIdByApiToken(plain);
    if (!userId || userId !== pack.authorId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
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
