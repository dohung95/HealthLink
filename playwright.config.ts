
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : [['html', { open: 'never' }]],
  outputDir: 'test-results',
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:63528',
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
    command: 'npm --prefix HealthLink_FE run dev -- --host 127.0.0.1 --port 63528 --strictPort',
    url: 'http://127.0.0.1:63528',
    reuseExistingServer: process.env.PW_REUSE_SERVER === 'true',
    timeout: 30_000,
  },
});
