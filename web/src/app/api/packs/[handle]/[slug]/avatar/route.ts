import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readSessionUserId } from "@/lib/session";
import { ensurePackDirs, storageRoot } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { MAX_AVATAR_BYTES, avatarTooLargeMessage } from "@/lib/upload-limits";

type Params = { params: Promise<{ handle: string; slug: string }> };

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug);
  if (!pack?.avatarRelPath) {
    return NextResponse.json({ error: "no avatar" }, { status: 404 });
  }
  const abs = path.join(storageRoot(), pack.avatarRelPath);
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(pack.avatarRelPath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, {
    allowRevoked: true,
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "avatar file required" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: avatarTooLargeMessage() }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".bin";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "allowed types: png, jpg, jpeg, gif, webp" },
      { status: 400 }
    );
  }

  await ensurePackDirs();
  const buf = Buffer.from(await file.arrayBuffer());

  if (pack.avatarRelPath) {
    const oldAbs = path.join(storageRoot(), pack.avatarRelPath);
    await fs.unlink(oldAbs).catch(() => {});
  }

  const rel = `avatars/${pack.id}${ext}`;
  const abs = path.join(storageRoot(), rel);
  await fs.writeFile(abs, buf);

  await prisma.pack.update({
    where: { id: pack.id },
    data: { avatarRelPath: rel },
  });

  return NextResponse.json({ ok: true, avatarRelPath: rel });
}
