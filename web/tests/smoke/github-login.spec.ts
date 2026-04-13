import { expect, test } from "@playwright/test";

function readCookieValueFromHeaders(
  response: { headersArray(): Array<{ name: string; value: string }> },
  cookieName: string
): string | null {
  for (const header of response.headersArray()) {
    if (header.name.toLowerCase() !== "set-cookie") continue;
    const [pair] = header.value.split(";");
    if (!pair) continue;
    const [name, ...valueParts] = pair.split("=");
    if (name?.trim() !== cookieName) continue;
    return valueParts.join("=").trim();
  }
  return null;
}

test("github login entry renders and oauth start endpoint redirects", async ({
  page,
  request,
}) => {
  await page.goto("/zh/login");
  await expect(page.getByRole("button", { name: "使用 GitHub 登录" })).toBeVisible();

  const oauthStart = await request.get("/api/auth/github/start?locale=zh&next=/dashboard", {
    maxRedirects: 0,
  });
  expect([302, 307]).toContain(oauthStart.status());

  const location = oauthStart.headers().location;
  expect(location).toBeTruthy();
  expect(location).toContain("https://github.com/login/oauth/authorize");
  expect(location).toContain("client_id=playwright-client-id");
  expect(location).toContain("scope=read%3Auser+user%3Aemail");
});

test("dashboard requires login and preserves next path", async ({ page }) => {
  await page.goto("/zh/dashboard");
  await expect(page).toHaveURL(/\/zh\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("button", { name: "使用 GitHub 登录" })).toBeVisible();
});

test("oauth callback with invalid state redirects to login with error", async ({
  page,
  request,
}) => {
  await page.goto("/zh/login");
  const callbackRes = await request.get("/api/auth/github/callback?code=fake&state=bad-state", {
    maxRedirects: 0,
  });
  expect([302, 307]).toContain(callbackRes.status());
  const location = callbackRes.headers().location;
  expect(location).toBeTruthy();
  expect(location).toContain("/login");
  expect(location).toContain("error=github_oauth");
});

test("oauth callback success sets session and redirects to next", async ({ request }) => {
  const oauthStart = await request.get("/api/auth/github/start?locale=zh&next=/dashboard", {
    maxRedirects: 0,
  });
  expect([302, 307]).toContain(oauthStart.status());
  const state = readCookieValueFromHeaders(oauthStart, "ocs_github_oauth_state");
  const next = readCookieValueFromHeaders(oauthStart, "ocs_github_oauth_next");
  expect(state).toBeTruthy();
  expect(next).toBeTruthy();

  const callbackRes = await request.get(`/api/auth/github/callback?code=fake&state=${state}`, {
    maxRedirects: 0,
    headers: {
      Cookie: `ocs_github_oauth_state=${state}; ocs_github_oauth_next=${next}`,
    },
  });
  expect([302, 307]).toContain(callbackRes.status());
  expect(callbackRes.headers().location).toContain("/zh/dashboard");
  expect(readCookieValueFromHeaders(callbackRes, "ocs_session")).toBeTruthy();
});
