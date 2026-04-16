import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserMock = vi.fn();
const findCodeMock = vi.fn();
const updateCodeMock = vi.fn();
const createUserMock = vi.fn();
const hashPasswordMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
      create: createUserMock,
    },
    emailLoginCode: {
      findFirst: findCodeMock,
      update: updateCodeMock,
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock("@/lib/email-login", () => ({
  hashEmailLoginCode: () => "hashed-code",
}));

vi.mock("@/lib/session", () => ({
  createSessionToken: vi.fn().mockResolvedValue("jwt-token"),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue("pw-hash");
  });

  it("returns 400 when email code is missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@example.com",
        password: "password-123",
        acceptPrivacy: true,
      }),
    }));
    expect(res.status).toBe(400);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when email code is invalid", async () => {
    findUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    findCodeMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@example.com",
        emailCode: "123456",
        password: "password-123",
        handle: "new-handle",
        acceptPrivacy: true,
      }),
    }));

    expect(res.status).toBe(401);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("creates user when email code is valid", async () => {
    findUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    findCodeMock.mockResolvedValue({ id: "code1" });
    updateCodeMock.mockResolvedValue({ id: "code1" });
    createUserMock.mockResolvedValue({ id: "u1" });

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@example.com",
        emailCode: "123456",
        password: "password-123",
        handle: "new-handle",
        acceptPrivacy: true,
      }),
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, userId: "u1" });
    expect(updateCodeMock).toHaveBeenCalledTimes(1);
    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ handle: "new-handle" }),
      })
    );
  });

  it("creates user without handle when email code is valid", async () => {
    findUserMock.mockResolvedValueOnce(null);
    findCodeMock.mockResolvedValue({ id: "code1" });
    updateCodeMock.mockResolvedValue({ id: "code1" });
    createUserMock.mockResolvedValue({ id: "u2" });

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonhandle@example.com",
        emailCode: "123456",
        password: "password-123",
        acceptPrivacy: true,
      }),
    }));

    expect(res.status).toBe(200);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ handle: null }),
      })
    );
  });
});
