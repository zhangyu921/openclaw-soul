import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { normalizeLocale, sanitizeNextPath } from "@/lib/auth-redirect";

const STATE_COOKIE = "ocs_github_oauth_state";
const NEXT_COOKIE = "ocs_github_oauth_next";
const OAUTH_MAX_AGE = 60 * 10;

function siteOrigin(req: NextRequest): string {
  const configured = process.env.OPENCLAW_SOUL_SITE_URL?.trim();
  if (!configured) return req.nextUrl.origin;
  return configured.replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID is not set" }, { status: 500 });
  }

  const locale = normalizeLocale(
    req.nextUrl.searchParams.get("locale") || req.cookies.get("NEXT_LOCALE")?.value
  );
  const nextPath = sanitizeNextPath(req.nextUrl.searchParams.get("next"), locale);
  const state = crypto.randomUUID();
  const redirectUri = `${siteOrigin(req)}/api/auth/github/callback`;

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "read:user user:email");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.set(NEXT_COOKIE, encodeURIComponent(nextPath), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
