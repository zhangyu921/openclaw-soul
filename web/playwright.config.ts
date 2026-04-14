import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
const useExistingDevServerOnly = process.env.PLAYWRIGHT_NO_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: useExistingDevServerOnly
    ? undefined
    : {
        // Keep DATABASE_URL even in mock mode: prisma is initialized at module import time.
        command:
          "AUTH_SECRET=playwright-auth-secret-1234 DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/openclaw_smoke GITHUB_CLIENT_ID=playwright-client-id GITHUB_CLIENT_SECRET=playwright-client-secret GITHUB_OAUTH_MOCK_USER_ID=playwright-user-id EMAIL_LOGIN_MOCK_USER_ID=playwright-user-id NEXT_TELEMETRY_DISABLED=1 pnpm exec next dev --port 3100",
        url: `${baseURL}/zh/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
