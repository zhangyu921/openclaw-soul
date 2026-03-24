import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { generateApiToken, hashApiToken } from "@/lib/token-api";

export async function GET() {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tokens = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  });
  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { label?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const plain = generateApiToken();
  const tokenHash = hashApiToken(plain);
  await prisma.apiToken.create({
    data: {
      tokenHash,
      label: body.label?.trim() || null,
      userId,
    },
  });
  return NextResponse.json({
    token: plain,
    message: "Save this token; it will not be shown again.",
  });
}
