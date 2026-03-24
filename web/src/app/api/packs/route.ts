import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { findUserIdByApiToken } from "@/lib/token-api";
import { assertValidSlug, avatarPathForPack, ensurePackDirs, zipPathForPack } from "@/lib/storage";

export async function GET() {
  const packs = await prisma.pack.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  const plain = m?.[1]?.trim();
  if (!plain) {
    return NextResponse.json({ error: "missing Bearer token" }, { status: 401 });
  }
  const authorId = await findUserIdByApiToken(plain);
  if (!authorId) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const slug = String(form.get("slug") || "").trim();
  const title = String(form.get("title") || "").trim();
  const summaryRaw = form.get("summary");
  const summary =
    typeof summaryRaw === "string" && summaryRaw.trim() ? summaryRaw.trim() : null;
  const zip = form.get("zip");
  const avatar = form.get("avatar");

  if (!slug || !title) {
    return NextResponse.json({ error: "slug and title required" }, { status: 400 });
  }
  try {
    assertValidSlug(slug);
  } catch {
    return NextResponse.json(
      { error: "invalid slug (lowercase letters, digits, hyphens)" },
      { status: 400 }
    );
  }

  if (!(zip instanceof File) || zip.size === 0) {
    return NextResponse.json({ error: "zip file required" }, { status: 400 });
  }

  const dup = await prisma.pack.findUnique({ where: { slug } });
  if (dup) {
    return NextResponse.json({ error: "slug already taken" }, { status: 409 });
  }

  await ensurePackDirs();
  const id = randomUUID();
  const zipBuf = Buffer.from(await zip.arrayBuffer());

  try {
    await fs.writeFile(zipPathForPack(id), zipBuf);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to store zip" }, { status: 500 });
  }

  let avatarRelPath: string | null = null;
  if (avatar instanceof File && avatar.size > 0) {
    const ext = path.extname(avatar.name) || ".bin";
    const ap = avatarPathForPack(id, ext);
    try {
      await fs.writeFile(ap, Buffer.from(await avatar.arrayBuffer()));
      avatarRelPath = `avatars/${id}${ext}`;
    } catch (e) {
      console.error(e);
      await fs.unlink(zipPathForPack(id)).catch(() => {});
      return NextResponse.json({ error: "failed to store avatar" }, { status: 500 });
    }
  }

  try {
    await prisma.pack.create({
      data: {
        id,
        slug,
        title,
        summary,
        zipRelPath: `packs/${id}.zip`,
        avatarRelPath,
        authorId,
      },
    });
  } catch (e) {
    console.error(e);
    await fs.unlink(zipPathForPack(id)).catch(() => {});
    if (avatarRelPath) {
      const ext = path.extname(avatarRelPath) || ".bin";
      await fs.unlink(avatarPathForPack(id, ext)).catch(() => {});
    }
    return NextResponse.json({ error: "failed to save pack" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    slug,
    downloadPath: `/api/packs/${encodeURIComponent(slug)}/download`,
  });
}
