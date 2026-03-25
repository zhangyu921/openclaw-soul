import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { generateApiToken, hashApiToken } from "@/lib/token-api";

export async function POST(req: Request) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { user_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body.user_code === "string" ? body.user_code : "";
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!compact) {
    return NextResponse.json({ error: "user_code required" }, { status: 400 });
  }

  const normalized = /^[A-Z0-9]{8}$/.test(compact)
    ? `${compact.slice(0, 4)}-${compact.slice(4)}`
    : compact;

  const row = await prisma.deviceLogin.findUnique({
    where: { userCode: normalized },
  });

  if (!row || row.status !== "pending") {
    return NextResponse.json(
      { error: "Invalid or already used code" },
      { status: 400 }
    );
  }

  if (row.expiresAt < new Date()) {
    await prisma.deviceLogin
      .update({
        where: { id: row.id },
        data: { status: "expired", accessTokenPlain: null },
      })
      .catch(() => {});
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }

  const plain = generateApiToken();
  const tokenHash = hashApiToken(plain);

  await prisma.$transaction([
    prisma.apiToken.create({
      data: {
        userId,
        tokenHash,
        label: "CLI (device login)",
      },
    }),
    prisma.deviceLogin.update({
      where: { id: row.id },
      data: {
        status: "approved",
        userId,
        accessTokenPlain: plain,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
