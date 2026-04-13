import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserMock = vi.fn();
const markUsedMock = vi.fn();
const createCodeMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
    emailLoginCode: {
      updateMany: markUsedMock,
      create: createCodeMock,
    },
  },
}));

vi.mock("@/lib/email-login", () => ({
  EMAIL_CODE_TTL_SECONDS: 600,
  normalizeAuthEmail: (raw: string) => raw.trim().toLowerCase(),
  generateEmailLoginCode: () => "123456",
  hashEmailLoginCode: () => "hashed-code",
}));

describe("POST /api/auth/email/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_EMAIL_CODE_WEBHOOK_URL;
  });

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({}),
    }));

    expect(res.status).toBe(400);
  });

  it("returns generic success when account does not exist", async () => {
    findUserMock.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@example.com" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      expiresInSeconds: 600,
    });
    expect(markUsedMock).not.toHaveBeenCalled();
    expect(createCodeMock).not.toHaveBeenCalled();
  });

  it("creates code for existing account and returns dev code", async () => {
    findUserMock.mockResolvedValue({ id: "u1" });
    markUsedMock.mockResolvedValue({ count: 1 });
    createCodeMock.mockResolvedValue({ id: "c1" });
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email: "USER@example.com" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      expiresInSeconds: 600,
      devCode: "123456",
    });
    expect(markUsedMock).toHaveBeenCalledTimes(1);
    expect(createCodeMock).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when register intent email already exists", async () => {
    findUserMock.mockResolvedValue({ id: "u1" });
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", intent: "register" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "email already registered" });
    expect(createCodeMock).not.toHaveBeenCalled();
  });

  it("creates code for register intent when email is new", async () => {
    findUserMock.mockResolvedValue(null);
    markUsedMock.mockResolvedValue({ count: 0 });
    createCodeMock.mockResolvedValue({ id: "c2" });
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", intent: "register" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      expiresInSeconds: 600,
      devCode: "123456",
    });
    expect(createCodeMock).toHaveBeenCalledTimes(1);
  });
});
