import { NextResponse } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { findUserIdByApiToken } from "@/lib/token-api";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readStoredFile, removeStoredFile, writeShowcaseImageForPack } from "@/lib/storage";
import { normalizeShowcaseImageRefs } from "@/lib/showcase-refs";
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
  const ref = refs[index];
  if (!ref) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const allowed = await canReadShowcaseImage(pack, req);
  if (!allowed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const buf = await readStoredFile(ref);
    const type = contentTypeForRef(ref);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": type,
        // 索引 URL 在重排后仍复用 ?i=，避免浏览器强缓存导致顺序与画面不一致
        "Cache-Control": "private, no-store",
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
  const nextRefs = [...refs, newRef];

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
  const ref = refs[idx];
  if (!ref) {
    return NextResponse.json({ error: "index out of range" }, { status: 400 });
  }

  const nextRefs = refs.filter((_, j) => j !== idx);
  await removeStoredFile(ref);
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
