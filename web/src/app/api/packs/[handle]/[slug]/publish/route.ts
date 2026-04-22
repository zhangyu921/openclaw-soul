import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { HOME_LISTING_PACKS_TAG } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { revalidateDataTag } from "@/lib/revalidate-data";
import { findPackByHandleAndSlug } from "@/lib/pack-lookup";
import { packIsSourceEmpty } from "@/lib/pack-source-empty";
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

  if (pack.authorDashboardHiddenAt) {
    return NextResponse.json(
      {
        error: "Cannot list a Soul that was removed from your dashboard.",
      },
      { status: 400 }
    );
  }

  if (await packIsSourceEmpty(prisma, pack.id)) {
    return NextResponse.json(
      {
        error: "在 pack 内至少添加一个文件后再上架。",
      },
      { status: 400 }
    );
  }

  await prisma.pack.update({
    where: { id: pack.id },
    data: { visibility: PackVisibility.LISTED },
  });

  revalidateDataTag(HOME_LISTING_PACKS_TAG);

  return NextResponse.json({ ok: true, visibility: PackVisibility.LISTED });
}
