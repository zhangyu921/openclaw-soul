import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { packIsSourceEmpty } from "@/lib/pack-source-empty";
import { prisma } from "@/lib/prisma";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
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

  if (await packIsSourceEmpty(prisma, pack.id)) {
    return NextResponse.json(
      { error: "pack has no source files" },
      { status: 400 }
    );
  }

  try {
    let buf: Buffer;
    if (pack.zipRelPath) {
      try {
        buf = await readStoredFile(pack.zipRelPath);
      } catch {
        try {
          const built = await buildAndStoreZipFromPackDb(prisma, pack.id);
          buf = built.zipBuf;
        } catch (e) {
          console.error(e);
          return NextResponse.json(
            { error: "failed to build pack zip" },
            { status: 500 }
          );
        }
      }
    } else {
      try {
        const built = await buildAndStoreZipFromPackDb(prisma, pack.id);
        buf = built.zipBuf;
      } catch (e) {
        console.error(e);
        return NextResponse.json(
          { error: "failed to build pack zip" },
          { status: 500 }
        );
      }
    }
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
