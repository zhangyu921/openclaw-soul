import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export function hashApiToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateApiToken(): string {
  return `ocs_${randomBytes(24).toString("base64url")}`;
}

export async function findUserIdByApiToken(
  plainToken: string
): Promise<string | null> {
  const tokenHash = hashApiToken(plainToken);
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  return row?.userId ?? null;
}
