import { prisma } from "@/lib/prisma";

export async function findPackByHandleAndSlug(handle: string, slug: string) {
  return prisma.pack.findFirst({
    where: {
      slug,
      author: { handle },
    },
  });
}
