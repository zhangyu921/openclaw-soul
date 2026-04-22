import { NextResponse } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { findUserIdByApiToken } from "@/lib/token-api";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readStoredFile, removeStoredFile, writeShowcaseImageForPack } from "@/lib/storage";
import { normalizeShowcaseImageRefs, type ShowcaseImageRef } from "@/lib/showcase-refs";
import { probeImageDimensions } from "@/lib/probe-image-dimensions";
import {
  MAX_SHOWCASE_IMAGE_BYTES,
  MAX_SHOWCASE_IMAGES,
  showcaseImageTooLargeMessage,
} from "@/lib/upload-limits";
type Params = { params: Promise<{ handle: string; slug: string }> };

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function contentTypeForRef(ref: string): string {
  let ext = "";
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    try {
      ext = path.extname(new URL(ref).pathname).toLowerCase();
    } catch {
      ext = "";
    }
  } else {
    ext = path.extname(ref).toLowerCase();
  }
  return MIME[ext] || "image/jpeg";
}

/** 按 `ref`（文件身份）派生 ETag；重排只改 `?i=` 时，同一槽位未换文件则 ETag 不变。 */
function etagForShowcaseRef(ref: string): string {
  const h = crypto.createHash("sha1").update(ref, "utf8").digest("hex");
  return `"${h}"`;
}

function ifNoneMatchEqualsCurrent(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  for (const part of ifNoneMatch.split(",")) {
    const t = part.trim();
    if (t === "*") continue;
    const tag = t.startsWith("W/") ? t.slice(2).trim() : t;
    if (tag === etag) return true;
  }
  return false;
}

function cacheControlForPack(visibility: PackVisibility): string {
  // `?i=` 在重排后可能指向不同文件，不能 immutable；ETag/304 + CDN 可 s-maxage 降低首访/边缘命中成本
  if (visibility === PackVisibility.LISTED) {
    return "public, max-age=60, s-maxage=3600, stale-while-revalidate=604800, must-revalidate";
  }
  return "private, max-age=0, must-revalidate";
}

async function canReadShowcaseImage(
  pack: { visibility: PackVisibility; authorId: string },
  req: Request
): Promise<boolean> {
  if (pack.visibility === PackVisibility.LISTED) return true;
  const sessionUserId = await readSessionUserId();
  if (sessionUserId === pack.authorId) return true;
  const auth = req.headers.get("authorization");
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  const plain = m?.[1]?.trim();
  if (plain) {
    const userId = await findUserIdByApiToken(plain);
    if (userId === pack.authorId) return true;
  }
  return false;
}

/** 访客拉取展示图：与头像一致的可见性规则。 */
export async function GET(req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const url = new URL(req.url);
  const iRaw = url.searchParams.get("i") ?? "0";
  const index = Number.parseInt(iRaw, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }

  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: {
      showcaseImageRefs: true,
      visibility: true,
      authorId: true,
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const refs = normalizeShowcaseImageRefs(pack.showcaseImageRefs);
  const entry = refs[index];
  if (!entry) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const allowed = await canReadShowcaseImage(pack, req);
  if (!allowed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const etag = etagForShowcaseRef(entry.ref);
  const cc = cacheControlForPack(pack.visibility);
  if (ifNoneMatchEqualsCurrent(req.headers.get("if-none-match"), etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": cc },
    });
  }

  try {
    const buf = await readStoredFile(entry.ref);
    const type = contentTypeForRef(entry.ref);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": type,
        ETag: etag,
        "Cache-Control": cc,
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
    allowUnlisted: true,
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
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "image file required" }, { status: 400 });
  }
  if (file.size > MAX_SHOWCASE_IMAGE_BYTES) {
    return NextResponse.json({ error: showcaseImageTooLargeMessage() }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".bin";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "allowed types: png, jpg, jpeg, gif, webp" },
      { status: 400 }
    );
  }

  const refs = normalizeShowcaseImageRefs(pack.showcaseImageRefs);
  if (refs.length >= MAX_SHOWCASE_IMAGES) {
    return NextResponse.json(
      { error: `at most ${MAX_SHOWCASE_IMAGES} showcase images` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const unique = crypto.randomUUID();
  const newRef = await writeShowcaseImageForPack(pack.id, unique, ext, buf);
  const dims = probeImageDimensions(buf);
  const newEntry: ShowcaseImageRef = { ref: newRef };
  if (dims) {
    newEntry.width = dims.width;
    newEntry.height = dims.height;
  }
  const nextRefs = [...refs, newEntry];

  await prisma.pack.update({
    where: { id: pack.id },
    data: { showcaseImageRefs: nextRefs },
  });

  return NextResponse.json({
    ok: true,
    index: nextRefs.length - 1,
    count: nextRefs.length,
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, {
    allowUnlisted: true,
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
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
  const idx = (body as { index?: unknown }).index;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0) {
    return NextResponse.json({ error: "index must be a non-negative integer" }, { status: 400 });
  }

  const refs = normalizeShowcaseImageRefs(pack.showcaseImageRefs);
  const entry = refs[idx];
  if (!entry) {
    return NextResponse.json({ error: "index out of range" }, { status: 400 });
  }

  const nextRefs = refs.filter((_, j) => j !== idx);
  await removeStoredFile(entry.ref);
  await prisma.pack.update({
    where: { id: pack.id },
    data: { showcaseImageRefs: nextRefs },
  });

  return NextResponse.json({ ok: true, count: nextRefs.length });
}

/** 按索引重排：`{ order: number[] }` 为 `0..n-1` 的一个排列。 */
export async function PATCH(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, {
    allowUnlisted: true,
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
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
  const order = (body as { order?: unknown }).order;
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order must be an array" }, { status: 400 });
  }

  const refs = normalizeShowcaseImageRefs(pack.showcaseImageRefs);
  const n = refs.length;
  if (order.length !== n) {
    return NextResponse.json({ error: "order length must match image count" }, { status: 400 });
  }
  const seen = new Set<number>();
  for (const x of order) {
    if (typeof x !== "number" || !Number.isInteger(x) || x < 0 || x >= n) {
      return NextResponse.json({ error: "invalid order entry" }, { status: 400 });
    }
    seen.add(x);
  }
  if (seen.size !== n) {
    return NextResponse.json({ error: "order must be a permutation" }, { status: 400 });
  }

  const nextRefs = order.map((i) => refs[i]);
  await prisma.pack.update({
    where: { id: pack.id },
    data: { showcaseImageRefs: nextRefs },
  });

  return NextResponse.json({ ok: true });
}
