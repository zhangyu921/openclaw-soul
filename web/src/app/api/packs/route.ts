import { NextResponse } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findUserIdByApiToken } from "@/lib/token-api";
import {
  assertValidSlug,
  ensurePackDirs,
  isRemoteStored,
  removeStoredFile,
  writeAvatarForPack,
  writeZipForPack,
} from "@/lib/storage";
import {
  MAX_AVATAR_BYTES,
  MAX_PACK_ZIP_BYTES,
  avatarTooLargeMessage,
  zipTooLargeMessage,
} from "@/lib/upload-limits";
import {
  checkPublishRateLimit,
  recordPublishSuccess,
} from "@/lib/publish-rate-limit";
import { requestOrigin } from "@/lib/device-auth";
import { ingestZipToPackSource } from "@/lib/pack-source-ingest";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { extractPackPreviewFromDb } from "@/lib/zip-pack-preview";

function resolvePackVisibility(
  form: FormData,
  existing: { visibility: PackVisibility } | null
): PackVisibility | { error: string } {
  if (existing && !form.has("visibility")) {
    return existing.visibility;
  }
  if (!existing && !form.has("visibility")) {
    return PackVisibility.UNLISTED;
  }
  const raw = form.get("visibility");
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "" || s === "UNLISTED") return PackVisibility.UNLISTED;
  if (s === "LISTED") return PackVisibility.LISTED;
  return { error: "invalid visibility" };
}

export async function GET() {
  const packs = await prisma.pack.findMany({
    where: { visibility: PackVisibility.LISTED, author: { handle: { not: null } } },
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

  const rl = checkPublishRateLimit(authorId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "publish rate limit exceeded; try again later" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

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

  if (avatar instanceof File && avatar.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: avatarTooLargeMessage() }, { status: 413 });
  }

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
  if (zipBuf.length > MAX_PACK_ZIP_BYTES) {
    return NextResponse.json({ error: zipTooLargeMessage() }, { status: 413 });
  }

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
  }

  const visRes = resolvePackVisibility(form, dup);
  if (typeof visRes === "object" && "error" in visRes) {
    return NextResponse.json({ error: visRes.error }, { status: 400 });
  }
  const targetVisibility = visRes;

  if (dup) {
    await ensurePackDirs();

    let preview: Awaited<ReturnType<typeof extractPackPreviewFromDb>>;

    try {
      await ingestZipToPackSource(prisma, dup.id, zipBuf);
      preview = await extractPackPreviewFromDb(prisma, dup.id);
      await buildAndStoreZipFromPackDb(prisma, dup.id);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "failed to sync pack source" },
        { status: 500 }
      );
    }

    const updateData: {
      title: string;
      summary: string | null;
      soulPreviewMd: string | null;
      soulPreviewTruncated: boolean;
      packFilePaths: string[];
      avatarRelPath?: string | null;
    } = {
      title,
      summary,
      soulPreviewMd: preview.soulPreviewMd,
      soulPreviewTruncated: preview.soulPreviewTruncated,
      packFilePaths: preview.packFilePaths,
    };

    if (avatar instanceof File && avatar.size > 0) {
      if (dup.avatarRelPath && !isRemoteStored(dup.avatarRelPath)) {
        await removeStoredFile(dup.avatarRelPath);
      }
      const ext = path.extname(avatar.name) || ".bin";
      try {
        updateData.avatarRelPath = await writeAvatarForPack(
          dup.id,
          ext,
          Buffer.from(await avatar.arrayBuffer())
        );
      } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "failed to store avatar" }, { status: 500 });
      }
    }

    try {
      await prisma.pack.update({
        where: { id: dup.id },
        data: { ...updateData, visibility: targetVisibility },
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "failed to update pack" }, { status: 500 });
    }

    recordPublishSuccess(authorId);
    const encH = encodeURIComponent(handle);
    const encS = encodeURIComponent(slug);
    const viewPath = `/packs/${encH}/${encS}`;
    const siteOrigin = requestOrigin(req);
    return NextResponse.json({
      ok: true,
      handle,
      slug,
      visibility: targetVisibility,
      downloadPath: `/api/packs/${encH}/${encS}/download`,
      viewPath,
      viewUrl: `${siteOrigin}${viewPath}`,
    });
  }

  await ensurePackDirs();
  const id = randomUUID();

  let zipRelPath: string;
  try {
    zipRelPath = await writeZipForPack(id, zipBuf);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to store zip" }, { status: 500 });
  }

  let avatarRelPath: string | null = null;
  if (avatar instanceof File && avatar.size > 0) {
    const ext = path.extname(avatar.name) || ".bin";
    try {
      avatarRelPath = await writeAvatarForPack(
        id,
        ext,
        Buffer.from(await avatar.arrayBuffer())
      );
    } catch (e) {
      console.error(e);
      await removeStoredFile(zipRelPath);
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
        zipRelPath,
        avatarRelPath,
        soulPreviewMd: null,
        soulPreviewTruncated: false,
        packFilePaths: [],
        authorId,
        visibility: targetVisibility,
      },
    });
  } catch (e) {
    console.error(e);
    await removeStoredFile(zipRelPath);
    if (avatarRelPath) await removeStoredFile(avatarRelPath);
    return NextResponse.json({ error: "failed to save pack" }, { status: 500 });
  }

  try {
    await ingestZipToPackSource(prisma, id, zipBuf);
    const preview = await extractPackPreviewFromDb(prisma, id);
    await buildAndStoreZipFromPackDb(prisma, id);
    await prisma.pack.update({
      where: { id },
      data: {
        soulPreviewMd: preview.soulPreviewMd,
        soulPreviewTruncated: preview.soulPreviewTruncated,
        packFilePaths: preview.packFilePaths,
      },
    });
  } catch (e) {
    console.error(e);
    try {
      await prisma.pack.delete({ where: { id } });
    } catch (delErr) {
      console.error(delErr);
    }
    await removeStoredFile(zipRelPath).catch(() => {});
    if (avatarRelPath) await removeStoredFile(avatarRelPath).catch(() => {});
    return NextResponse.json(
      { error: "failed to sync pack source" },
      { status: 500 }
    );
  }

  recordPublishSuccess(authorId);
  const encH = encodeURIComponent(handle);
  const encS = encodeURIComponent(slug);
  const viewPath = `/packs/${encH}/${encS}`;
  const siteOrigin = requestOrigin(req);
  return NextResponse.json({
    ok: true,
    handle,
    slug,
    visibility: targetVisibility,
    downloadPath: `/api/packs/${encH}/${encS}/download`,
    viewPath,
    viewUrl: `${siteOrigin}${viewPath}`,
  });
}
