/**
 * 本地开发：为指定 handle 批量插入模拟 Pack（用于列表/UI 调试）。
 *
 * Usage（仓库根目录，DATABASE_URL 已配置）:
 *   pnpm --filter @openclaw-soul/web exec tsx --tsconfig tsconfig.json scripts/seed-mock-packs.ts
 */
import "./load-env";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const HANDLE = "testzh";
const COUNT = 30;
const SLUG_PREFIX = "seed-mock-";

async function main(): Promise<void> {
  let user = await prisma.user.findUnique({ where: { handle: HANDLE } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `${HANDLE}-seed@local.openclaw-soul.invalid`,
        handle: HANDLE,
        passwordHash: await hashPassword("seed-mock-password"),
      },
    });
    console.log(`created user ${HANDLE} (${user.id})`);
  } else {
    console.log(`using existing user ${HANDLE} (${user.id})`);
  }

  const data = Array.from({ length: COUNT }, (_, i) => {
    const n = i + 1;
    const slug = `${SLUG_PREFIX}${String(n).padStart(2, "0")}`;
    return {
      slug,
      title: `模拟 Pack ${n}`,
      summary: `本地种子数据 #${n}（${HANDLE}）`,
      zipRelPath: `__mock__/${HANDLE}/${slug}.zip`,
      soulPreviewMd: `## ${slug}\n\n模拟 SOUL 预览片段。`,
      soulPreviewTruncated: false,
      packFilePaths: ["SOUL.md", "README.md"] as unknown as object,
      authorId: user.id,
      visibility: PackVisibility.LISTED,
    };
  });

  const result = await prisma.pack.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`inserted ${result.count} new pack(s) (skipDuplicates on authorId+slug)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
