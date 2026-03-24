import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashDeviceCode } from "@/lib/device-auth";

type Body = {
  grant_type?: string;
  device_code?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const device_code = typeof body.device_code === "string" ? body.device_code.trim() : "";
  if (!device_code) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const deviceCodeHash = hashDeviceCode(device_code);
  const row = await prisma.deviceLogin.findUnique({
    where: { deviceCodeHash },
  });

  if (!row) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const now = new Date();
  if (row.expiresAt < now && row.status === "pending") {
    await prisma.deviceLogin
      .update({
        where: { id: row.id },
        data: { status: "expired", accessTokenPlain: null },
      })
      .catch(() => {});
    return NextResponse.json({ error: "expired_token" }, { status: 400 });
  }

  if (row.expiresAt < now) {
    return NextResponse.json({ error: "expired_token" }, { status: 400 });
  }

  if (row.status === "pending") {
    return NextResponse.json({ error: "authorization_pending" }, { status: 400 });
  }

  if (row.status === "approved" && row.accessTokenPlain) {
    const access_token = row.accessTokenPlain;
    await prisma.deviceLogin.update({
      where: { id: row.id },
      data: { accessTokenPlain: null, status: "consumed" },
    });
    return NextResponse.json({
      access_token,
      token_type: "Bearer",
    });
  }

  return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
}
