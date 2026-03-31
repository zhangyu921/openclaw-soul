import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, handle: true },
  });
  return NextResponse.json({ user });
}
