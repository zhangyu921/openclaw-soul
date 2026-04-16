import { NextResponse } from "next/server";
import { hashEmailLoginCode } from "@/lib/email-login";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { assertValidHandle } from "@/lib/storage";

export async function POST(req: Request) {
  let body: {
    email?: string;
    password?: string;
    handle?: string;
    emailCode?: string;
    acceptPrivacy?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const handleRaw = body.handle?.trim().toLowerCase() ?? "";
  const emailCode = body.emailCode?.trim();
  if (!email || !password || !emailCode) {
    return NextResponse.json(
      { error: "email, email code, and password required" },
      { status: 400 }
    );
  }
  if (body.acceptPrivacy !== true) {
    return NextResponse.json(
      { error: "you must accept the privacy & upload terms to register" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password min 8 chars" }, { status: 400 });
  }

  let handle: string | null = null;
  if (handleRaw) {
    try {
      assertValidHandle(handleRaw);
    } catch {
      return NextResponse.json(
        {
          error:
            "handle must be lowercase letters, digits, and hyphens only (3–40 chars recommended)",
        },
        { status: 400 }
      );
    }
    const existsHandle = await prisma.user.findUnique({ where: { handle: handleRaw } });
    if (existsHandle) {
      return NextResponse.json({ error: "handle already taken" }, { status: 409 });
    }
    handle = handleRaw;
  }

  const existsEmail = await prisma.user.findUnique({ where: { email } });
  if (existsEmail) {
    return NextResponse.json({ error: "email already registered" }, { status: 409 });
  }

  const now = new Date();
  const codeHash = hashEmailLoginCode(email, emailCode);
  const codeRecord = await prisma.emailLoginCode.findFirst({
    where: {
      email,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!codeRecord) {
    return NextResponse.json({ error: "invalid or expired email code" }, { status: 401 });
  }

  await prisma.emailLoginCode.update({
    where: { id: codeRecord.id },
    data: { usedAt: now },
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, handle },
    select: { id: true },
  });
  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, userId: user.id });
}
