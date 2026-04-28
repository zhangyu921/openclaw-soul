import { NextResponse } from "next/server";

import { forkPackForSessionUser } from "@/lib/pack-fork";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const slug =
    typeof body === "object" && body !== null
      ? String((body as Record<string, unknown>).slug ?? "").trim()
      : "";

  const { handle, slug: sourceSlug } = await params;

  const result = await forkPackForSessionUser(
    prisma,
    userId,
    handle,
    sourceSlug,
    slug
  );

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      no_handle: 400,
      invalid_slug: 400,
      slug_taken: 409,
      source_not_found: 404,
      source_not_listed: 404,
      cannot_fork_own: 403,
      rate_limited: 429,
      fork_failed: 500,
    };
    const status = statusMap[result.error] ?? 500;
    const headers =
      result.error === "rate_limited" && result.retryAfterSec != null
        ? { "Retry-After": String(result.retryAfterSec) }
        : undefined;
    return NextResponse.json({ error: result.error }, { status, headers });
  }

  return NextResponse.json({
    ok: true,
    handle: result.handle,
    slug: result.slug,
    viewPath: result.viewPath,
  });
}
