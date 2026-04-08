import { NextResponse } from "next/server";
import { createEmptyPackForUserId } from "@/lib/pack-create-web";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const slug = String((body as Record<string, unknown>).slug ?? "").trim();

  try {
    const result = await createEmptyPackForUserId(prisma, userId, slug);
    if (!result.ok) {
      if (result.error === "no_handle") {
        return NextResponse.json(
          {
            error:
              "account has no public handle; set it in the dashboard before creating a pack",
          },
          { status: 400 }
        );
      }
      if (result.error === "invalid_slug") {
        return NextResponse.json(
          { error: "invalid slug (lowercase letters, digits, hyphens)" },
          { status: 400 }
        );
      }
      if (result.error === "slug_taken") {
        return NextResponse.json(
          { error: "you already have a pack with this slug" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "cannot create pack" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      handle: result.handle,
      slug: result.slug,
      viewPath: result.viewPath,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "failed to create pack" },
      { status: 500 }
    );
  }
}
