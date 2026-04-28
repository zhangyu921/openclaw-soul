-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "forkedFromHandle" TEXT,
ADD COLUMN     "forkedFromPackId" TEXT,
ADD COLUMN     "forkedFromSlug" TEXT;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_forkedFromPackId_fkey" FOREIGN KEY ("forkedFromPackId") REFERENCES "Pack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
