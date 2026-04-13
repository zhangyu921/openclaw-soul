import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upsertMock = vi.fn();
const hashPasswordMock = vi.fn();
const createSessionTokenMock = vi.fn();
const setSessionCookieMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock("@/lib/session", () => ({
  createSessionToken: createSessionTokenMock,
  setSessionCookie: setSessionCookieMock,
}));

function makeReq(url: string, cookie?: string): NextRequest {
  return new NextRequest(url, {
    headers: cookie ? { cookie } : undefined,
  });
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/auth/github/callback failure branches", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = "test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
    delete process.env.GITHUB_OAUTH_MOCK_USER_ID;
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("redirects to login when access token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 500 })));

    const { GET } = await import("./route");
    const req = makeReq(
      "http://localhost:3100/api/auth/github/callback?code=fake-code&state=good-state",
      "ocs_github_oauth_state=good-state; ocs_github_oauth_next=%2Fzh%2Fdashboard"
    );
    const res = await GET(req);

    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/zh/login");
    expect(res.headers.get("location")).toContain("error=github_oauth");
    expect(res.headers.get("set-cookie")).toContain("ocs_github_oauth_state=");
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("redirects to login when github email is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonRes({ access_token: "tok" }))
        .mockResolvedValueOnce(jsonRes({ email: null }))
        .mockResolvedValueOnce(jsonRes([]))
    );

    const { GET } = await import("./route");
    const req = makeReq(
      "http://localhost:3100/api/auth/github/callback?code=fake-code&state=good-state",
      "ocs_github_oauth_state=good-state; ocs_github_oauth_next=%2Fzh%2Fdashboard"
    );
    const res = await GET(req);

    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/zh/login");
    expect(res.headers.get("location")).toContain("error=github_oauth");
    expect(setSessionCookieMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
