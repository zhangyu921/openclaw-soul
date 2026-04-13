import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "AUTH_SECRET=playwright-auth-secret-1234 DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/openclaw_smoke GITHUB_CLIENT_ID=playwright-client-id GITHUB_CLIENT_SECRET=playwright-client-secret GITHUB_OAUTH_MOCK_USER_ID=playwright-user-id NEXT_TELEMETRY_DISABLED=1 pnpm exec next dev --port 3100",
    url: "http://localhost:3100/zh/login",
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
