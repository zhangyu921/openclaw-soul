import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type FindPackOpts = {
  /**
   * If true, match pack even when `visibility` is UNLISTED (author-only flows).
   * Default: public only (LISTED).
   */
  allowUnlisted?: boolean;
};

export async function findPackByHandleAndSlug(
  handle: string,
  slug: string,
  opts?: FindPackOpts
) {
  return prisma.pack.findFirst({
    where: {
      slug,
      author: { handle },
      ...(opts?.allowUnlisted ? {} : { visibility: PackVisibility.LISTED }),
    },
  });
}
