-- Drop Pack.artifactSource (only DB-backed pack source remains; see spec 2026-04-03-pack-artifact-db-only-design).

ALTER TABLE "Pack" DROP COLUMN "artifactSource";

DROP TYPE "PackArtifactSource";
