import { NextResponse } from "next/server";

import { hashEmailLoginCode, normalizeAuthEmail } from "@/lib/email-login";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";

type VerifyBody = {
  email?: string;
  code?: string;
};

export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim() || !body.code?.trim()) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }

  const email = normalizeAuthEmail(body.email);
  const codeHash = hashEmailLoginCode(email, body.code.trim());
  const now = new Date();
  const mockUserId = process.env.EMAIL_LOGIN_MOCK_USER_ID?.trim();

  if (mockUserId && process.env.NODE_ENV !== "production") {
    const token = await createSessionToken(mockUserId);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, userId: mockUserId });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }

  const record = await prisma.emailLoginCode.findFirst({
    where: {
      email,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!record) {
    return NextResponse.json({ error: "invalid or expired code" }, { status: 401 });
  }

  await prisma.emailLoginCode.update({
    where: { id: record.id },
    data: { usedAt: now },
  });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, userId: user.id });
}
