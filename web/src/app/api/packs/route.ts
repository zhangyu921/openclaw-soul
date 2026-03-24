import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { findUserIdByApiToken } from "@/lib/token-api";
import {
  assertValidSlug,
  avatarPathForPack,
  ensurePackDirs,
  zipPathForPack,
} from "@/lib/storage";

export async function GET() {
  const packs = await prisma.pack.findMany({
    where: { author: { handle: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      author: { select: { handle: true } },
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

  const user = await prisma.user.findUnique({
    where: { id: authorId },
    select: { handle: true },
  });
  if (!user?.handle?.trim()) {
    return NextResponse.json(
      {
        error:
          "account has no public handle; set it in the dashboard (or register with a handle) before publishing",
      },
      { status: 400 }
    );
  }
  const handle = user.handle.trim();

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const slug = String(form.get("slug") || "").trim();
  const titleRaw = String(form.get("title") || "").trim();
  const title = titleRaw || slug;
  const summaryRaw = form.get("summary");
  const summary =
    typeof summaryRaw === "string" && summaryRaw.trim() ? summaryRaw.trim() : null;
  const zip = form.get("zip");
  const avatar = form.get("avatar");

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
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

  const zipBuf = Buffer.from(await zip.arrayBuffer());

  const dup = await prisma.pack.findFirst({
    where: { authorId, slug },
  });
  if (dup) {
    const replaceRaw = form.get("replace");
    const wantsReplace =
      replaceRaw === "true" ||
      replaceRaw === "1" ||
      String(replaceRaw ?? "")
        .trim()
        .toLowerCase() === "yes";
    if (!wantsReplace) {
      return NextResponse.json(
        { error: "you already have a pack with this slug" },
        { status: 409 }
      );
    }

    await ensurePackDirs();
    try {
      await fs.writeFile(zipPathForPack(dup.id), zipBuf);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "failed to store zip" }, { status: 500 });
    }

    const updateData: {
      title: string;
      summary: string | null;
      avatarRelPath?: string | null;
    } = { title, summary };

    if (avatar instanceof File && avatar.size > 0) {
      if (dup.avatarRelPath) {
        const oldExt = path.extname(dup.avatarRelPath) || ".bin";
        await fs.unlink(avatarPathForPack(dup.id, oldExt)).catch(() => {});
      }
      const ext = path.extname(avatar.name) || ".bin";
      const ap = avatarPathForPack(dup.id, ext);
      try {
        await fs.writeFile(ap, Buffer.from(await avatar.arrayBuffer()));
        updateData.avatarRelPath = `avatars/${dup.id}${ext}`;
      } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "failed to store avatar" }, { status: 500 });
      }
    }

    try {
      await prisma.pack.update({
        where: { id: dup.id },
        data: updateData,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "failed to update pack" }, { status: 500 });
    }

    const encH = encodeURIComponent(handle);
    const encS = encodeURIComponent(slug);
    return NextResponse.json({
      ok: true,
      handle,
      slug,
      downloadPath: `/api/packs/${encH}/${encS}/download`,
      viewPath: `/packs/${encH}/${encS}`,
    });
  }

  await ensurePackDirs();
  const id = randomUUID();

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

  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  return NextResponse.json({
    ok: true,
    handle,
    slug,
    downloadPath: `/api/packs/${encH}/${encS}/download`,
    viewPath: `/packs/${encH}/${encS}`,
  });
}
