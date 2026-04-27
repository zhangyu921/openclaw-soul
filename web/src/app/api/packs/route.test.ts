import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AVATAR_BYTES,
  MAX_PACK_ZIP_BYTES,
  avatarTooLargeMessage,
  zipTooLargeMessage,
} from "@/lib/upload-limits";

const API_PACKS_URL = "http://localhost/api/packs";

const h = vi.hoisted(() => {
  const pack = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const user = { findUnique: vi.fn() };
  return {
    prisma: { pack, user },
    findUserIdByApiToken: vi.fn(),
    revalidateDataTag: vi.fn(),
    checkPublishRateLimit: vi.fn(),
    recordPublishSuccess: vi.fn(),
    assertValidSlug: vi.fn(),
    ensurePackDirs: vi.fn(),
    isRemoteStored: vi.fn(),
    removeStoredFile: vi.fn(),
    writeAvatarForPack: vi.fn(),
    writeZipForPack: vi.fn(),
    ingestZipToPackSource: vi.fn(),
    buildAndStoreZipFromPackDb: vi.fn(),
    extractPackFilePathsFromDb: vi.fn(),
    requestOrigin: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/token-api", () => ({
  findUserIdByApiToken: h.findUserIdByApiToken,
}));
vi.mock("@/lib/revalidate-data", () => ({
  revalidateDataTag: h.revalidateDataTag,
}));
vi.mock("@/lib/publish-rate-limit", () => ({
  checkPublishRateLimit: h.checkPublishRateLimit,
  recordPublishSuccess: h.recordPublishSuccess,
}));
vi.mock("@/lib/storage", () => ({
  assertValidSlug: h.assertValidSlug,
  ensurePackDirs: h.ensurePackDirs,
  isRemoteStored: h.isRemoteStored,
  removeStoredFile: h.removeStoredFile,
  writeAvatarForPack: h.writeAvatarForPack,
  writeZipForPack: h.writeZipForPack,
}));
vi.mock("@/lib/device-auth", () => ({
  requestOrigin: h.requestOrigin,
}));
vi.mock("@/lib/pack-source-ingest", () => ({
  ingestZipToPackSource: h.ingestZipToPackSource,
}));
vi.mock("@/lib/pack-source-zip", () => ({
  buildAndStoreZipFromPackDb: h.buildAndStoreZipFromPackDb,
}));
vi.mock("@/lib/zip-pack-preview", () => ({
  extractPackFilePathsFromDb: h.extractPackFilePathsFromDb,
}));

function bearer(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` };
}

function smallZipFile(): File {
  return new File([new Uint8Array(10)], "pack.zip", { type: "application/zip" });
}

function multipartPost(form: FormData, headers: Record<string, string> = {}): Request {
  return new Request(API_PACKS_URL, {
    method: "POST",
    headers: { ...bearer("good-token"), ...headers },
    body: form,
  });
}

function resetPostMocks() {
  vi.clearAllMocks();
  h.assertValidSlug.mockReset();
  h.findUserIdByApiToken.mockResolvedValue("user1");
  h.checkPublishRateLimit.mockReturnValue({ ok: true });
  h.prisma.user.findUnique.mockResolvedValue({ handle: "user1" });
  h.prisma.pack.findFirst.mockResolvedValue(null);
  h.ensurePackDirs.mockResolvedValue(undefined);
  h.writeZipForPack.mockResolvedValue("packs/abc123/abc123.zip");
  h.writeAvatarForPack.mockResolvedValue("packs/abc123/avatar.png");
  h.prisma.pack.create.mockResolvedValue({});
  h.prisma.pack.update.mockResolvedValue({});
  h.ingestZipToPackSource.mockResolvedValue(undefined);
  h.extractPackFilePathsFromDb.mockResolvedValue({ packFilePaths: ["hello.md"] });
  h.buildAndStoreZipFromPackDb.mockResolvedValue(undefined);
  h.requestOrigin.mockReturnValue("https://example.com");
}

describe("GET /api/packs", () => {
  let GET: (typeof import("./route"))["GET"];

  beforeAll(async () => {
    ({ GET } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty packs array when no listed packs exist", async () => {
    h.prisma.pack.findMany.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ packs: [] });
    expect(h.prisma.pack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorDashboardHiddenAt: null,
        }),
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("returns listed packs with author handles", async () => {
    h.prisma.pack.findMany.mockResolvedValue([
      {
        slug: "my-pack",
        title: "My Pack",
        summary: "A cool pack",
        avatarRelPath: null,
        createdAt: new Date("2024-01-01"),
        author: { handle: "user1" },
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.packs).toHaveLength(1);
    expect(json.packs[0].slug).toBe("my-pack");
    expect(json.packs[0].author.handle).toBe("user1");
  });
});

describe("POST /api/packs", () => {
  let POST: (typeof import("./route"))["POST"];

  beforeAll(async () => {
    ({ POST } = await import("./route"));
  });

  beforeEach(() => {
    resetPostMocks();
  });

  it("returns 401 when Bearer token is missing", async () => {
    const res = await POST(new Request(API_PACKS_URL, { method: "POST" }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("missing Bearer token");
  });

  it("returns 401 when Bearer token is invalid", async () => {
    h.findUserIdByApiToken.mockResolvedValue(null);

    const res = await POST(
      new Request(API_PACKS_URL, {
        method: "POST",
        headers: bearer("bad-token"),
      })
    );

    expect(res.status).toBe(401);
    expect(h.findUserIdByApiToken).toHaveBeenCalledWith("bad-token");
  });

  it("returns 400 when user has no handle", async () => {
    h.prisma.user.findUnique.mockResolvedValue({ handle: null });

    const res = await POST(
      new Request(API_PACKS_URL, {
        method: "POST",
        headers: bearer("good-token"),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("no public handle");
  });

  it("returns 429 when rate limit exceeded", async () => {
    h.checkPublishRateLimit.mockReturnValue({
      ok: false,
      retryAfterSec: 120,
    });

    const res = await POST(
      new Request(API_PACKS_URL, {
        method: "POST",
        headers: bearer("good-token"),
      })
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("returns 400 when content-type is not multipart/form-data", async () => {
    const res = await POST(
      new Request(API_PACKS_URL, {
        method: "POST",
        headers: {
          ...bearer("good-token"),
          "content-type": "application/json",
        },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("multipart/form-data");
  });

  it("returns 400 when slug is missing", async () => {
    const form = new FormData();
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("slug required");
  });

  it("returns 400 when slug is invalid", async () => {
    h.assertValidSlug.mockImplementation(() => {
      throw new Error("bad slug");
    });

    const form = new FormData();
    form.set("slug", "BAD SLUG!!!");
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("invalid slug");
  });

  it("returns 400 when zip is missing", async () => {
    const form = new FormData();
    form.set("slug", "my-pack");

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("zip file required");
  });

  it("returns 413 when avatar is too large", async () => {
    const form = new FormData();
    form.set("slug", "my-pack");
    form.set("zip", smallZipFile());
    form.set(
      "avatar",
      new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], "big.png", {
        type: "image/png",
      })
    );

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe(avatarTooLargeMessage());
  });

  it("returns 413 when zip is too large", async () => {
    const form = new FormData();
    form.set("slug", "my-pack");
    form.set(
      "zip",
      new File([new Uint8Array(MAX_PACK_ZIP_BYTES + 1)], "big.zip", {
        type: "application/zip",
      })
    );

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe(zipTooLargeMessage());
  });

  it("returns 409 when duplicate slug and replace flag not set", async () => {
    h.prisma.pack.findFirst.mockResolvedValue({ id: "existing", slug: "my-pack" });

    const form = new FormData();
    form.set("slug", "my-pack");
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("already have a pack");
  });

  it("creates a new pack successfully", async () => {
    const form = new FormData();
    form.set("slug", "my-pack");
    form.set("title", "My Pack");
    form.set("summary", "A cool pack");
    form.set("visibility", "LISTED");
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.handle).toBe("user1");
    expect(json.slug).toBe("my-pack");
    expect(json.visibility).toBe("LISTED");
    expect(json.viewUrl).toContain("example.com");
    expect(h.prisma.pack.create).toHaveBeenCalledTimes(1);
    expect(h.ingestZipToPackSource).toHaveBeenCalledTimes(1);
    expect(h.buildAndStoreZipFromPackDb).toHaveBeenCalledTimes(1);
    expect(h.recordPublishSuccess).toHaveBeenCalledWith("user1");
    expect(h.revalidateDataTag).toHaveBeenCalled();
  });

  it("replaces existing pack when replace flag is true", async () => {
    h.prisma.pack.findFirst.mockResolvedValue({
      id: "existing",
      slug: "my-pack",
      avatarRelPath: null,
      visibility: "UNLISTED",
    });

    const form = new FormData();
    form.set("slug", "my-pack");
    form.set("title", "Updated Pack");
    form.set("replace", "true");
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(200);
    expect(h.prisma.pack.create).not.toHaveBeenCalled();
    expect(h.prisma.pack.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing" },
        data: expect.objectContaining({ title: "Updated Pack" }),
      })
    );
  });

  it("returns 400 when visibility is invalid", async () => {
    const form = new FormData();
    form.set("slug", "my-pack");
    form.set("visibility", "PUBLIC");
    form.set("zip", smallZipFile());

    const res = await POST(multipartPost(form));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid visibility");
  });
});
