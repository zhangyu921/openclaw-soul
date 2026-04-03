/**
 * 本地开发：为指定 handle 批量插入模拟 Pack（用于列表/UI 调试）。
 * 与线上一致：子表真源 + 缓存 zip（ingest → 预览 → build zip）。
 *
 * Usage（仓库根目录，DATABASE_URL 已配置）:
 *   pnpm --filter @openclaw-soul/web exec tsx --tsconfig tsconfig.json scripts/seed-mock-packs.ts
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import yazl from "yazl";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ingestZipToPackSource } from "@/lib/pack-source-ingest";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { ensurePackDirs, writeZipForPack } from "@/lib/storage";
import { extractPackPreviewFromDb } from "@/lib/zip-pack-preview";

const HANDLE = "testzh";
const COUNT = 30;
const SLUG_PREFIX = "seed-mock-";

function mockZipBytes(slug: string): Promise<Buffer> {
  const zip = new yazl.ZipFile();
  zip.addBuffer(
    Buffer.from(`## ${slug}\n\n模拟 SOUL 预览片段。`, "utf8"),
    "SOUL.md"
  );
  zip.addBuffer(Buffer.from(`Mock readme for ${slug}`, "utf8"), "README.md");
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zip.outputStream.on("data", (c: Buffer) => chunks.push(c));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.end();
  });
}

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

  await ensurePackDirs();

  let inserted = 0;
  for (let i = 1; i <= COUNT; i++) {
    const n = String(i).padStart(2, "0");
    const slug = `${SLUG_PREFIX}${n}`;
    const dup = await prisma.pack.findFirst({
      where: { authorId: user.id, slug },
    });
    if (dup) continue;

    const zipBuf = await mockZipBytes(slug);
    const id = randomUUID();
    const zipRelPath = await writeZipForPack(id, zipBuf);

    await prisma.pack.create({
      data: {
        id,
        slug,
        title: `模拟 Pack ${i}`,
        summary: `本地种子数据 #${i}（${HANDLE}）`,
        zipRelPath,
        soulPreviewMd: null,
        soulPreviewTruncated: false,
        packFilePaths: [],
        authorId: user.id,
        visibility: PackVisibility.LISTED,
      },
    });

    await ingestZipToPackSource(prisma, id, zipBuf);
    const preview = await extractPackPreviewFromDb(prisma, id);
    await buildAndStoreZipFromPackDb(prisma, id);
    await prisma.pack.update({
      where: { id },
      data: {
        soulPreviewMd: preview.soulPreviewMd,
        soulPreviewTruncated: preview.soulPreviewTruncated,
        packFilePaths: preview.packFilePaths,
      },
    });
    inserted += 1;
  }

  console.log(`inserted ${inserted} new pack(s) (skipped existing slugs)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
