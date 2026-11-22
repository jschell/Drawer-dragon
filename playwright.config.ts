import { defineConfig, devices } from '@playwright/test';

/**
 * Target devices (spec §2): iPhone SE 2+ (same screen as the SE 3rd gen),
 * iPad 9th gen+ (same 1080×810 screen as gen 7), and laptops.
 * WebKit projects run in CI; locally, run `npm run e2e -- --project=iphone-se-chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone-se-webkit', use: { ...devices['iPhone SE (3rd gen) landscape'] } },
    { name: 'ipad-webkit', use: { ...devices['iPad (gen 7) landscape'] } },
    { name: 'desktop-safari', use: { ...devices['Desktop Safari'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'iphone-se-chromium',
      use: { ...devices['iPhone SE (3rd gen) landscape'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
  ],
});
