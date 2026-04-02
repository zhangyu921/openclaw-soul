import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ handle: string; slug: string }> };

/** List on gallery: set visibility to LISTED. Author-only. Idempotent. */
export async function POST(_req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, { allowUnlisted: true });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (pack.visibility === PackVisibility.LISTED) {
    return NextResponse.json({ ok: true, visibility: PackVisibility.LISTED });
  }

  await prisma.pack.update({
    where: { id: pack.id },
    data: { visibility: PackVisibility.LISTED },
  });

  return NextResponse.json({ ok: true, visibility: PackVisibility.LISTED });
}
