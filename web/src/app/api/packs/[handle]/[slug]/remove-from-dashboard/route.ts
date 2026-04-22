import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { HOME_LISTING_PACKS_TAG } from "@/lib/cache-tags";
import { internalSlugAfterDashboardHide } from "@/lib/pack-dashboard-hide";
import { prisma } from "@/lib/prisma";
import { revalidateDataTag } from "@/lib/revalidate-data";
import { readSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ handle: string; slug: string }> };

/**
 * Author-only: hide pack from「我的 Souls」, unlist, and rewrite slug so the public slug is free for a new pack.
 */
export async function POST(_req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle }, authorDashboardHiddenAt: null },
    select: { id: true, authorId: true, slug: true },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const nextSlug = internalSlugAfterDashboardHide(pack.id);
  try {
    await prisma.pack.update({
      where: { id: pack.id },
      data: {
        slugBeforeDashboardHide: pack.slug,
        slug: nextSlug,
        authorDashboardHiddenAt: new Date(),
        visibility: PackVisibility.UNLISTED,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "slug conflict" }, { status: 409 });
    }
    throw e;
  }

  revalidateDataTag(HOME_LISTING_PACKS_TAG);

  return NextResponse.json({ ok: true as const });
}
