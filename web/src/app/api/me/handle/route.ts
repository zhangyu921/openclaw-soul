import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { assertValidHandle } from "@/lib/storage";

/** One-time: set public handle for accounts created before handle was required. */
export async function PATCH(req: Request) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { handle: true },
  });
  if (user?.handle) {
    return NextResponse.json({ error: "handle already set" }, { status: 400 });
  }
  let body: { handle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const handle = body.handle?.trim().toLowerCase();
  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  try {
    assertValidHandle(handle);
  } catch {
    return NextResponse.json(
      { error: "invalid handle (lowercase letters, digits, hyphens)" },
      { status: 400 }
    );
  }
  const taken = await prisma.user.findUnique({ where: { handle } });
  if (taken) {
    return NextResponse.json({ error: "handle already taken" }, { status: 409 });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { handle },
  });
  return NextResponse.json({ ok: true, handle });
}
