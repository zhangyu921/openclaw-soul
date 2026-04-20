import { PackVisibility } from "@/generated/prisma/client";

export function canViewPack(
  userId: string | null,
  pack: {
    authorId: string;
    visibility: PackVisibility;
    authorDashboardHiddenAt?: Date | null;
  }
): boolean {
  if (pack.authorDashboardHiddenAt && (!userId || userId !== pack.authorId)) {
    return false;
  }
  if (pack.visibility === PackVisibility.LISTED) return true;
  return Boolean(userId && userId === pack.authorId);
}
