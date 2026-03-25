import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { readSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ handle: string; slug: string }> };

/** Soft-unpublish: keeps DB row and stored files; public gallery and download stop. */
export async function POST(_req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await findPackByHandleAndSlug(handle, slug, { allowRevoked: true });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (pack.revokedAt) {
    return NextResponse.json({ error: "already revoked" }, { status: 400 });
  }

  await prisma.pack.update({
    where: { id: pack.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
