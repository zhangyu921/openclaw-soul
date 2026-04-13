import { NextResponse } from "next/server";

import {
  EMAIL_CODE_TTL_SECONDS,
  generateEmailLoginCode,
  hashEmailLoginCode,
  normalizeAuthEmail,
} from "@/lib/email-login";
import { sendLoginCodeWithResend } from "@/lib/email-delivery";
import { prisma } from "@/lib/prisma";

type RequestBody = {
  email?: string;
  intent?: "login" | "register";
};

async function deliverEmailCode(email: string, code: string): Promise<boolean> {
  if (await sendLoginCodeWithResend({ email, code, ttlSeconds: EMAIL_CODE_TTL_SECONDS })) {
    return true;
  }

  const webhook = process.env.AUTH_EMAIL_CODE_WEBHOOK_URL?.trim();
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "openclaw-soul-auth-email-code",
        email,
        code,
        ttlSeconds: EMAIL_CODE_TTL_SECONDS,
      }),
      cache: "no-store",
    });
    return res.ok;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // Dev/test fallback to keep the flow runnable without SMTP integration.
  console.info(`[auth/email] code for ${email}: ${code}`);
  return true;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const email = normalizeAuthEmail(body.email);
  const intent = body.intent === "register" ? "register" : "login";
  const mockUserId = process.env.EMAIL_LOGIN_MOCK_USER_ID?.trim();
  if (mockUserId && process.env.NODE_ENV !== "production") {
    const code = generateEmailLoginCode();
    return NextResponse.json({
      ok: true,
      expiresInSeconds: EMAIL_CODE_TTL_SECONDS,
      devCode: code,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (intent === "login" && !user) {
    return NextResponse.json({
      ok: true,
      expiresInSeconds: EMAIL_CODE_TTL_SECONDS,
    });
  }
  if (intent === "register" && user) {
    return NextResponse.json({ error: "email already registered" }, { status: 409 });
  }

  const code = generateEmailLoginCode();
  const codeHash = hashEmailLoginCode(email, code);
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_SECONDS * 1000);

  await prisma.emailLoginCode.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailLoginCode.create({
    data: {
      email,
      codeHash,
      expiresAt,
    },
  });

  const delivered = await deliverEmailCode(email, code);
  if (!delivered) {
    return NextResponse.json(
      { error: "email code delivery is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    expiresInSeconds: EMAIL_CODE_TTL_SECONDS,
    ...(process.env.NODE_ENV === "production" ? {} : { devCode: code }),
  });
}
