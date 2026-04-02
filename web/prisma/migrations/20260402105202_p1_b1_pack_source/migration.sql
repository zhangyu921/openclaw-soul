-- CreateEnum
CREATE TYPE "PackArtifactSource" AS ENUM ('BLOB', 'DB');

-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "artifactSource" "PackArtifactSource" NOT NULL DEFAULT 'BLOB';

-- CreateTable
CREATE TABLE "PackMarkdownFile" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackMarkdownFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackBinaryFile" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "storageRef" TEXT NOT NULL,
    "byteSize" INTEGER,
    "sha256" TEXT,

    CONSTRAINT "PackBinaryFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackMarkdownFile_packId_path_key" ON "PackMarkdownFile"("packId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "PackBinaryFile_packId_path_key" ON "PackBinaryFile"("packId", "path");

-- AddForeignKey
ALTER TABLE "PackMarkdownFile" ADD CONSTRAINT "PackMarkdownFile_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackBinaryFile" ADD CONSTRAINT "PackBinaryFile_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
