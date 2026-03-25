-- AlterTable
ALTER TABLE "Pack" ADD COLUMN "soulPreviewMd" TEXT,
ADD COLUMN "soulPreviewTruncated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "packFilePaths" JSONB NOT NULL DEFAULT '[]';
