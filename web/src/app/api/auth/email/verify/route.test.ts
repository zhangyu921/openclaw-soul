import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserMock = vi.fn();
const findCodeMock = vi.fn();
const updateCodeMock = vi.fn();
const createSessionTokenMock = vi.fn();
const setSessionCookieMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
    emailLoginCode: {
      findFirst: findCodeMock,
      update: updateCodeMock,
    },
  },
}));

vi.mock("@/lib/email-login", () => ({
  normalizeAuthEmail: (raw: string) => raw.trim().toLowerCase(),
  hashEmailLoginCode: () => "hashed-code",
}));

vi.mock("@/lib/session", () => ({
  createSessionToken: createSessionTokenMock,
  setSessionCookie: setSessionCookieMock,
}));

describe("POST /api/auth/email/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when payload missing", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email: "a@example.com" }),
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when code invalid", async () => {
    findUserMock.mockResolvedValue({ id: "u1" });
    findCodeMock.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email: "a@example.com", code: "123456" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(401);
    expect(setSessionCookieMock).not.toHaveBeenCalled();
  });

  it("sets session when code is valid", async () => {
    findUserMock.mockResolvedValue({ id: "u1" });
    findCodeMock.mockResolvedValue({ id: "code1" });
    updateCodeMock.mockResolvedValue({ id: "code1" });
    createSessionTokenMock.mockResolvedValue("session-token");
    setSessionCookieMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email: "a@example.com", code: "123456" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, userId: "u1" });
    expect(updateCodeMock).toHaveBeenCalledTimes(1);
    expect(setSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
