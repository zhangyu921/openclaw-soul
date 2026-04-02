/**
 * 维护者脚本：将 BLOB 模式 pack 的 zip 摄入库表并切换为 DB 模式，再写回缓存 zip。
 *
 * 幂等：重复运行会对同一 pack 先 `deleteMany` 子表再全量 ingest（ingest 内已按新 zip 删旧路径）。
 *
 * Usage (from repo root, DATABASE_URL set):
 *   pnpm --filter @openclaw-soul/web exec tsx --tsconfig tsconfig.json scripts/migrate-pack-to-db-source.ts --packIds=id1,id2
 *   pnpm --filter @openclaw-soul/web exec tsx --tsconfig tsconfig.json scripts/migrate-pack-to-db-source.ts --all
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PackArtifactSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ingestZipToPackSource } from "@/lib/pack-source-ingest";
import { buildAndStoreZipFromPackDb } from "@/lib/pack-source-zip";
import { readStoredFile, removeStoredFileIfExists } from "@/lib/storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../.env") });
loadEnv({ path: path.join(__dirname, "../.env.local") });

function parseArgs(argv: string[]): { packIds: string[] | null; all: boolean } {
  let all = false;
  let packIds: string[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--all") {
      all = true;
    }
    if (argv[i] === "--packIds" && argv[i + 1]) {
      packIds = argv[i + 1]!.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    }
  }
  return { packIds, all };
}

async function migrateOne(packId: string): Promise<void> {
  const pack = await prisma.pack.findUnique({ where: { id: packId } });
  if (!pack) {
    throw new Error(`pack not found: ${packId}`);
  }
  if (pack.artifactSource === PackArtifactSource.DB) {
    console.error(`skip (already DB): ${pack.slug} (${packId})`);
    return;
  }
  const zipBuf = await readStoredFile(pack.zipRelPath);
  const oldBins = await prisma.packBinaryFile.findMany({
    where: { packId },
    select: { storageRef: true },
  });
  for (const b of oldBins) {
    await removeStoredFileIfExists(b.storageRef);
  }
  await prisma.packMarkdownFile.deleteMany({ where: { packId } });
  await prisma.packBinaryFile.deleteMany({ where: { packId } });
  await ingestZipToPackSource(prisma, packId, zipBuf);
  await prisma.pack.update({
    where: { id: packId },
    data: { artifactSource: PackArtifactSource.DB },
  });
  await buildAndStoreZipFromPackDb(prisma, packId);
  console.error(`ok: ${pack.slug} (${packId})`);
}

async function main(): Promise<void> {
  const { packIds, all } = parseArgs(process.argv.slice(2));
  if (!all && (!packIds || packIds.length === 0)) {
    console.error(
      "Usage: --packIds=id1,id2 | --all   (requires DATABASE_URL)"
    );
    process.exit(1);
  }

  const targets = all
    ? (
        await prisma.pack.findMany({
          where: { artifactSource: PackArtifactSource.BLOB },
          select: { id: true },
        })
      ).map((p) => p.id)
    : packIds!;

  for (const id of targets) {
    try {
      await migrateOne(id);
    } catch (e) {
      console.error(`fail ${id}:`, e);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
