import { expect, test } from "@playwright/test";

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
