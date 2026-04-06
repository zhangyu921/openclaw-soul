import { NextResponse } from "next/server";
import { normalizeZipEntryPath } from "@/lib/pack-paths";
import { canViewPack } from "@/lib/pack-access";
import { prisma } from "@/lib/prisma";
import { syncPackDerivedAfterSourceChange } from "@/lib/pack-source-sync";
import { readSessionUserId } from "@/lib/session";
import { MAX_PACK_MARKDOWN_UTF8_BYTES } from "@/lib/upload-limits";

type Params = { params: Promise<{ handle: string; slug: string }> };

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

async function findPackForSourceApi(handle: string, slug: string) {
  return prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: {
      id: true,
      authorId: true,
      visibility: true,
    },
  });
}

function normalizePathParam(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  return normalizeZipEntryPath(raw);
}

export async function GET(req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const userId = await readSessionUserId();
  const pack = await findPackForSourceApi(handle, slug);
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!canViewPack(userId, pack)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const normalized = normalizePathParam(url.searchParams.get("path"));
  if (!normalized) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const md = await prisma.packMarkdownFile.findUnique({
    where: { packId_path: { packId: pack.id, path: normalized } },
    select: { path: true, content: true, updatedAt: true },
  });
  if (md) {
    return NextResponse.json({
      kind: "markdown" as const,
      path: md.path,
      content: md.content,
      updatedAt: md.updatedAt.toISOString(),
    });
  }

  const bin = await prisma.packBinaryFile.findUnique({
    where: { packId_path: { packId: pack.id, path: normalized } },
    select: { path: true, byteSize: true },
  });
  if (bin) {
    return NextResponse.json({
      kind: "binary" as const,
      path: bin.path,
      byteSize: bin.byteSize,
    });
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Params) {
  const sessionUserId = await readSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: { id: true, authorId: true },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== sessionUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const rawPath = b.path;
  const rawContent = b.content;
  if (typeof rawPath !== "string") {
    return NextResponse.json({ error: "path must be a string" }, { status: 400 });
  }
  if (typeof rawContent !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  const normalized = normalizeZipEntryPath(rawPath);
  if (!normalized) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const bytes = utf8ByteLength(rawContent);
  if (bytes > MAX_PACK_MARKDOWN_UTF8_BYTES) {
    return NextResponse.json(
      {
        error: `content too large (max ${MAX_PACK_MARKDOWN_UTF8_BYTES} UTF-8 bytes)`,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.packMarkdownFile.findUnique({
    where: { packId_path: { packId: pack.id, path: normalized } },
    select: { content: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "markdown file not found" }, { status: 404 });
  }

  const prevContent = existing.content;
  try {
    await prisma.packMarkdownFile.update({
      where: { packId_path: { packId: pack.id, path: normalized } },
      data: { content: rawContent },
    });
    await syncPackDerivedAfterSourceChange(prisma, pack.id);
  } catch (e) {
    console.error(e);
    try {
      await prisma.packMarkdownFile.update({
        where: { packId_path: { packId: pack.id, path: normalized } },
        data: { content: prevContent },
      });
    } catch (revertErr) {
      console.error(revertErr);
    }
    return NextResponse.json({ error: "failed to save pack source" }, { status: 500 });
  }

  const row = await prisma.packMarkdownFile.findUnique({
    where: { packId_path: { packId: pack.id, path: normalized } },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    ok: true as const,
    path: normalized,
    updatedAt: row?.updatedAt.toISOString() ?? new Date().toISOString(),
  });
}
