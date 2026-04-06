import { PackVisibility } from "@/generated/prisma/client";

export function canViewPack(
  userId: string | null,
  pack: { authorId: string; visibility: PackVisibility }
): boolean {
  if (pack.visibility === PackVisibility.LISTED) return true;
  return Boolean(userId && userId === pack.authorId);
}
