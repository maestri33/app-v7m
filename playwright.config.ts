import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "node tests/e2e/mock-backend.mjs",
          url: "http://127.0.0.1:8765/health",
          reuseExistingServer: false,
        },
        {
          command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
          url: baseURL,
          reuseExistingServer: false,
          env: {
            ...process.env,
            APP_ENV: "test",
            BACKEND_URL: "http://127.0.0.1:8765",
            OMNIROUTE_BASE_URL: "http://127.0.0.1:8765",
            OMNIROUTE_API_KEY: "e2e-key",
            OMNIROUTE_EDUCATION_MODEL: "e2e-education",
          },
        },
      ],
});
