import { defineConfig, devices } from '@playwright/test';

// Browser (Chromium) tests for behaviour unit tests can't reach: the launcher intro and teaser, the
// monitoring section and its links, and phone layout. They run against the BUILT site, so build first:
// `npm run test:e2e` does both; CI builds in a separate step (.github/workflows/ci.yml).
const PORT = 4322;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Always start a fresh server on the build just made, so a server left over from an earlier
    // build can't be tested by mistake. Opt in to reuse with PW_REUSE_SERVER=1 (e.g. while iterating).
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
