-- CreateEnum
CREATE TYPE "PackVisibility" AS ENUM ('UNLISTED', 'LISTED');

-- AlterTable: add nullable column first (backfill before drop)
ALTER TABLE "Pack" ADD COLUMN "visibility" "PackVisibility";

-- Backfill from revokedAt: unpublished → UNLISTED; published → LISTED
UPDATE "Pack"
SET "visibility" = CASE
  WHEN "revokedAt" IS NOT NULL THEN 'UNLISTED'::"PackVisibility"
  ELSE 'LISTED'::"PackVisibility"
END;

-- Drop legacy column
ALTER TABLE "Pack" DROP COLUMN "revokedAt";

-- Default for new rows; enforce NOT NULL
ALTER TABLE "Pack" ALTER COLUMN "visibility" SET DEFAULT 'UNLISTED'::"PackVisibility";
ALTER TABLE "Pack" ALTER COLUMN "visibility" SET NOT NULL;
