import { prisma } from "@/lib/prisma";

export type FindPackOpts = {
  /** If true, include soft-revoked packs (author-only flows). Default: public only. */
  allowRevoked?: boolean;
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
      ...(opts?.allowRevoked ? {} : { revokedAt: null }),
    },
  });
}
