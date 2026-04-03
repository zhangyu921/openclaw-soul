-- AlterTable
ALTER TABLE "Pack" ADD COLUMN "showcaseMd" TEXT,
ADD COLUMN "showcaseImageRefs" JSONB NOT NULL DEFAULT '[]'::jsonb;
