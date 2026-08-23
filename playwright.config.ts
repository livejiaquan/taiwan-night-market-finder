import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 20_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4321/taiwan-night-market-finder/",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4321 --strictPort",
    url: "http://127.0.0.1:4321/taiwan-night-market-finder/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
