import type { PrismaClient } from "@/generated/prisma/client";

/** True when pack has no markdown or binary source rows (apply/download have nothing). */
export async function packIsSourceEmpty(
  db: PrismaClient,
  packId: string
): Promise<boolean> {
  const [md, bin] = await Promise.all([
    db.packMarkdownFile.count({ where: { packId } }),
    db.packBinaryFile.count({ where: { packId } }),
  ]);
  return md === 0 && bin === 0;
}
