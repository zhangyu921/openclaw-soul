import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { PackVisibility, type Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { syncPackDerivedAfterSourceChange } from "@/lib/pack-source-sync";
import { normalizeShowcaseImageRefs } from "@/lib/showcase-refs";
import {
  assertValidSlug,
  ensurePackDirs,
  readStoredFile,
  removeStoredFile,
  writeAvatarForPack,
  writeBinaryForPack,
  writeShowcaseImageForPack,
} from "@/lib/storage";
import {
  checkPublishRateLimit,
  recordPublishSuccess,
} from "@/lib/publish-rate-limit";

export type ForkPackResult =
  | { ok: true; handle: string; slug: string; viewPath: string }
  | { ok: false; error: ForkPackError; retryAfterSec?: number };

export type ForkPackError =
  | "no_handle"
  | "invalid_slug"
  | "slug_taken"
  | "source_not_found"
  | "source_not_listed"
  | "cannot_fork_own"
  | "rate_limited"
  | "fork_failed";

function extFromStorageRef(ref: string): string {
  try {
    if (/^https?:\/\//i.test(ref)) {
      const u = new URL(ref);
      const e = path.extname(u.pathname);
      return e || ".bin";
    }
  } catch {
    // fall through
  }
  const e = path.extname(ref);
  return e || ".bin";
}

/**
 * Duplicate a LISTED Soul into the caller's account (UNLISTED), with fork lineage metadata.
 */
export async function forkPackForSessionUser(
  db: PrismaClient,
  sessionUserId: string,
  sourceHandleRaw: string,
  sourceSlugRaw: string,
  newSlugRaw: string
): Promise<ForkPackResult> {
  const rl = checkPublishRateLimit(sessionUserId);
  if (!rl.ok) {
    return {
      ok: false,
      error: "rate_limited",
      retryAfterSec: rl.retryAfterSec,
    };
  }

  const user = await db.user.findUnique({
    where: { id: sessionUserId },
    select: { handle: true },
  });
  const handle = user?.handle?.trim() ?? "";
  if (!handle) {
    return { ok: false, error: "no_handle" };
  }

  const newSlug = newSlugRaw.trim();
  if (!newSlug) {
    return { ok: false, error: "invalid_slug" };
  }
  try {
    assertValidSlug(newSlug);
  } catch {
    return { ok: false, error: "invalid_slug" };
  }

  const taken = await db.pack.findFirst({
    where: { slug: newSlug, authorId: sessionUserId },
    select: { id: true },
  });
  if (taken) {
    return { ok: false, error: "slug_taken" };
  }

  const sourceHandle = sourceHandleRaw.trim();
  const sourceSlug = sourceSlugRaw.trim();

  const source = await db.pack.findFirst({
    where: {
      slug: sourceSlug,
      author: { handle: sourceHandle },
    },
    include: {
      author: { select: { handle: true } },
      markdownFiles: true,
      binaryFiles: true,
    },
  });

  if (!source) {
    return { ok: false, error: "source_not_found" };
  }
  if (source.visibility !== PackVisibility.LISTED || source.authorDashboardHiddenAt) {
    return { ok: false, error: "source_not_listed" };
  }
  if (source.authorId === sessionUserId) {
    return { ok: false, error: "cannot_fork_own" };
  }

  const forkedHandle = source.author.handle?.trim();
  const forkedSlug = source.slug.trim();
  if (!forkedHandle) {
    return { ok: false, error: "source_not_found" };
  }

  const newId = randomUUID();
  const orphanRefs: string[] = [];

  try {
    await ensurePackDirs();

    type BinRow = {
      path: string;
      storageRef: string;
      byteSize: number | null;
      sha256: string | null;
    };
    const binaryRows: BinRow[] = [];
    for (const bin of source.binaryFiles) {
      const buf = await readStoredFile(bin.storageRef);
      const sha256Hex = createHash("sha256").update(buf).digest("hex");
      const storageRef = await writeBinaryForPack(newId, bin.path, buf);
      orphanRefs.push(storageRef);
      binaryRows.push({
        path: bin.path,
        storageRef,
        byteSize: buf.length,
        sha256: sha256Hex,
      });
    }

    let avatarRelPath: string | null = null;
    if (source.avatarRelPath) {
      const buf = await readStoredFile(source.avatarRelPath);
      const ext =
        path.extname(
          /^https?:\/\//i.test(source.avatarRelPath)
            ? (() => {
                try {
                  return path.extname(new URL(source.avatarRelPath).pathname);
                } catch {
                  return "";
                }
              })()
            : source.avatarRelPath
        ) || ".bin";
      avatarRelPath = await writeAvatarForPack(newId, ext, buf);
      orphanRefs.push(avatarRelPath);
    }

    const showRefs = normalizeShowcaseImageRefs(source.showcaseImageRefs);
    const arr: { ref: string; width?: number; height?: number }[] = [];
    for (const ref of showRefs) {
      const buf = await readStoredFile(ref.ref);
      const uid = randomUUID();
      const ext = extFromStorageRef(ref.ref);
      const newRef = await writeShowcaseImageForPack(newId, uid, ext, buf);
      orphanRefs.push(newRef);
      const entry: { ref: string; width?: number; height?: number } = {
        ref: newRef,
      };
      if (ref.width !== undefined) entry.width = ref.width;
      if (ref.height !== undefined) entry.height = ref.height;
      arr.push(entry);
    }
    const showcaseJson = arr as unknown as Prisma.InputJsonValue;

    const mdData: { path: string; content: string }[] =
      source.markdownFiles.map((m) => ({
        path: m.path,
        content: m.content,
      }));

    await db.pack.create({
      data: {
        id: newId,
        slug: newSlug,
        title: source.title,
        summary: source.summary,
        zipRelPath: null,
        packFilePaths: [],
        avatarRelPath,
        showcaseMd: source.showcaseMd,
        showcaseImageRefs: showcaseJson,
        authorId: sessionUserId,
        visibility: PackVisibility.UNLISTED,
        forkedFromPackId: source.id,
        forkedFromHandle: forkedHandle,
        forkedFromSlug: forkedSlug,
        profileViewCount: 0,
        ...(mdData.length > 0
          ? {
              markdownFiles: {
                createMany: {
                  data: mdData,
                },
              },
            }
          : {}),
        ...(binaryRows.length > 0
          ? {
              binaryFiles: {
                createMany: {
                  data: binaryRows,
                },
              },
            }
          : {}),
      },
    });

    await syncPackDerivedAfterSourceChange(db, newId);

    recordPublishSuccess(sessionUserId);

    const encH = encodeURIComponent(handle);
    const encS = encodeURIComponent(newSlug);
    return {
      ok: true,
      handle,
      slug: newSlug,
      viewPath: `/packs/${encH}/${encS}`,
    };
  } catch (e) {
    console.error("forkPackForSessionUser", e);
    try {
      await db.pack.delete({ where: { id: newId } });
    } catch {
      /* ignore */
    }
    await Promise.all(orphanRefs.map((ref) => removeStoredFile(ref).catch(() => {})));
    return { ok: false, error: "fork_failed" };
  }
}
