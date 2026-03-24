import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_LOGIN_EXPIRY_MS,
  DEVICE_POLL_INTERVAL_SEC,
  generateDeviceCode,
  generateUserCode,
  hashDeviceCode,
  requestOrigin,
} from "@/lib/device-auth";

/** `instanceof` breaks across some Next/Turbopack bundles; use Prisma error code. */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

export async function POST(req: Request) {
  try {
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
        if (isUniqueViolation(e)) continue;
        throw e;
      }
    }
    return NextResponse.json(
      { error: "could_not_allocate_device_session" },
      { status: 500 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[device/start]", e);
    const hint =
      message.includes("DeviceLogin") || message.includes("does not exist")
        ? " Run `cd web && npx prisma migrate dev` (or `migrate deploy` in production) to apply the schema (DeviceLogin table)."
        : "";
    return NextResponse.json(
      {
        error: "device_start_failed",
        message: message + hint,
      },
      { status: 500 }
    );
  }
}
