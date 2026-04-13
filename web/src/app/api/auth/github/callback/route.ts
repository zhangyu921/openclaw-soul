import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { localeFromPathname, normalizeLocale, sanitizeNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const STATE_COOKIE = "ocs_github_oauth_state";
const NEXT_COOKIE = "ocs_github_oauth_next";

type GithubAccessTokenResponse = {
  access_token?: string;
  error?: string;
};

type GithubUserResponse = {
  email?: string | null;
};

type GithubEmailResponse = Array<{
  email: string;
  primary: boolean;
  verified: boolean;
}>;

function siteOrigin(req: NextRequest): string {
  const configured = process.env.OPENCLAW_SOUL_SITE_URL?.trim();
  if (!configured) return req.nextUrl.origin;
  return configured.replace(/\/+$/, "");
}

function clearOauthCookies(res: NextResponse): void {
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
}

function loginUrlWithError(pathname: string): string {
  const locale = localeFromPathname(pathname);
  const login = new URL(`/${locale}/login`, "http://localhost");
  login.searchParams.set("next", pathname);
  login.searchParams.set("error", "github_oauth");
  return `${login.pathname}${login.search}`;
}

async function fetchPrimaryEmail(accessToken: string): Promise<string | null> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as GithubUserResponse;
  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim().toLowerCase();
  }

  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!emailsRes.ok) return null;
  const emails = (await emailsRes.json()) as GithubEmailResponse;
  const primary = emails.find((item) => item.primary && item.verified);
  if (primary) return primary.email.trim().toLowerCase();
  const fallback = emails.find((item) => item.verified);
  return fallback ? fallback.email.trim().toLowerCase() : null;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const mockUserId = process.env.GITHUB_OAUTH_MOCK_USER_ID?.trim();

  const nextFromCookie = req.cookies.get(NEXT_COOKIE)?.value;
  const locale = normalizeLocale(req.cookies.get("NEXT_LOCALE")?.value);
  const nextPath = sanitizeNextPath(
    nextFromCookie ? decodeURIComponent(nextFromCookie) : null,
    locale
  );

  const redirectToLogin = () => {
    const res = NextResponse.redirect(new URL(loginUrlWithError(nextPath), req.nextUrl.origin));
    clearOauthCookies(res);
    return res;
  };

  if (!clientId || !clientSecret) {
    return redirectToLogin();
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectToLogin();
  }

  if (mockUserId && process.env.NODE_ENV !== "production") {
    const token = await createSessionToken(mockUserId);
    await setSessionCookie(token);
    const res = NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
    clearOauthCookies(res);
    return res;
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${siteOrigin(req)}/api/auth/github/callback`,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    return redirectToLogin();
  }

  const tokenData = (await tokenRes.json()) as GithubAccessTokenResponse;
  if (!tokenData.access_token || tokenData.error) {
    return redirectToLogin();
  }

  const email = await fetchPrimaryEmail(tokenData.access_token);
  if (!email) {
    return redirectToLogin();
  }

  const passwordHash = await hashPassword(`github-oauth-${crypto.randomUUID()}`);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
    },
    select: { id: true },
  });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  const res = NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
  clearOauthCookies(res);
  return res;
}
