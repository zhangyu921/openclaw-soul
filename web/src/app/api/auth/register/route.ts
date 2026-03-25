import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { assertValidHandle } from "@/lib/storage";

export async function POST(req: Request) {
  let body: { email?: string; password?: string; handle?: string; acceptPrivacy?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const handle = body.handle?.trim().toLowerCase();
  if (!email || !password || !handle) {
    return NextResponse.json(
      { error: "email, password, and public handle required" },
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
  try {
    assertValidHandle(handle);
  } catch {
    return NextResponse.json(
      {
        error:
          "handle must be lowercase letters, digits, and hyphens only (3–40 chars recommended)",
      },
      { status: 400 }
    );
  }
  const existsEmail = await prisma.user.findUnique({ where: { email } });
  if (existsEmail) {
    return NextResponse.json({ error: "email already registered" }, { status: 409 });
  }
  const existsHandle = await prisma.user.findUnique({ where: { handle } });
  if (existsHandle) {
    return NextResponse.json({ error: "handle already taken" }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { email, passwordHash, handle } });
  return NextResponse.json({ ok: true });
}
