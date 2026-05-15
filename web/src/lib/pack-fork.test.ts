import { PackVisibility } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forkPackForSessionUser } from "@/lib/pack-fork";

const h = vi.hoisted(() => {
  const user = { findUnique: vi.fn() };
  const pack = { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() };
  return { user, pack, prisma: { user, pack } };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));

vi.mock("@/lib/publish-rate-limit", () => ({
  checkPublishRateLimit: vi.fn(() => ({ ok: true as const })),
  recordPublishSuccess: vi.fn(),
}));

vi.mock("@/lib/pack-source-sync", () => ({
  syncPackDerivedAfterSourceChange: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  assertValidSlug: vi.fn((s: string) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw new Error("bad");
  }),
  ensurePackDirs: vi.fn(),
  readStoredFile: vi.fn(),
  removeStoredFile: vi.fn(),
  writeAvatarForPack: vi.fn(),
  writeBinaryForPack: vi.fn(),
  writeShowcaseImageForPack: vi.fn(),
}));

describe("forkPackForSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.user.findUnique.mockResolvedValue({ handle: "alice" });
    h.pack.findFirst.mockImplementation((args: { where?: { authorId?: string } }) => {
      if (args?.where?.authorId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });
  });

  it("returns cannot_fork_own when viewer is the author", async () => {
    h.pack.findFirst.mockImplementation((args: { where?: { authorId?: string; slug?: string } }) => {
      if (args?.where?.authorId === "u1") {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        id: "p1",
        slug: "src",
        title: "T",
        summary: null,
        visibility: PackVisibility.LISTED,
        authorDashboardHiddenAt: null,
        authorId: "u1",
        avatarRelPath: null,
        showcaseMd: null,
        showcaseImageRefs: [],
        author: { handle: "bob" },
        markdownFiles: [],
        binaryFiles: [],
      });
    });

    const r = await forkPackForSessionUser(
      h.prisma as never,
      "u1",
      "bob",
      "src",
      "fork-slug"
    );
    expect(r).toEqual({ ok: false, error: "cannot_fork_own" });
  });

  it("returns source_not_listed when source is unlisted", async () => {
    h.pack.findFirst.mockImplementation((args: { where?: { authorId?: string } }) => {
      if (args?.where?.authorId) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        id: "p1",
        slug: "src",
        title: "T",
        summary: null,
        visibility: PackVisibility.UNLISTED,
        authorDashboardHiddenAt: null,
        authorId: "bob",
        avatarRelPath: null,
        showcaseMd: null,
        showcaseImageRefs: [],
        author: { handle: "bob" },
        markdownFiles: [],
        binaryFiles: [],
      });
    });

    const r = await forkPackForSessionUser(
      h.prisma as never,
      "u1",
      "bob",
      "src",
      "fork-slug"
    );
    expect(r).toEqual({ ok: false, error: "source_not_listed" });
  });

  it("returns rate_limited when publish limit exceeded", async () => {
    const { checkPublishRateLimit } = await import("@/lib/publish-rate-limit");
    vi.mocked(checkPublishRateLimit).mockReturnValueOnce({
      ok: false,
      retryAfterSec: 120,
    });

    const r = await forkPackForSessionUser(
      h.prisma as never,
      "u1",
      "bob",
      "src",
      "fork-slug"
    );
    expect(r).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSec: 120,
    });
  });
});
