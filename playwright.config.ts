
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.PLAYWRIGHT_WORKERS || 1),
  globalTimeout: 8 * 60_000,
  timeout: 45_000,
  maxFailures: process.env.CI ? undefined : 1,
  reporter: process.env.CI ? 'line' : [['html', { open: 'never' }]],
  outputDir: 'test-results',
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:63528',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

  ],
  webServer: {
    command: `"${process.execPath}" HealthLink_FE/node_modules/vite/bin/vite.js HealthLink_FE --host localhost --port 63528 --strictPort`,
    url: 'http://localhost:63528',
    reuseExistingServer: process.env.PW_REUSE_SERVER === 'true',
    timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
