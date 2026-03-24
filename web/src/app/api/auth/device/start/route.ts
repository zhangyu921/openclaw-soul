import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_LOGIN_EXPIRY_MS,
  DEVICE_POLL_INTERVAL_SEC,
  generateDeviceCode,
  generateUserCode,
  hashDeviceCode,
  requestOrigin,
} from "@/lib/device-auth";

export async function POST(req: Request) {
  const expiresAt = new Date(Date.now() + DEVICE_LOGIN_EXPIRY_MS);
  const origin = requestOrigin(req);

  for (let attempt = 0; attempt < 8; attempt++) {
    const device_code = generateDeviceCode();
    const deviceCodeHash = hashDeviceCode(device_code);
    const userCode = generateUserCode();
    try {
      await prisma.deviceLogin.create({
        data: {
          deviceCodeHash,
          userCode,
          status: "pending",
          expiresAt,
        },
      });
      const verification_uri = `${origin}/cli/device?user_code=${encodeURIComponent(userCode)}`;
      return NextResponse.json({
        device_code,
        user_code: userCode,
        verification_uri,
        expires_in: Math.floor(DEVICE_LOGIN_EXPIRY_MS / 1000),
        interval: DEVICE_POLL_INTERVAL_SEC,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        continue;
      }
      throw e;
    }
  }
  return NextResponse.json({ error: "could not allocate device session" }, { status: 500 });
}
