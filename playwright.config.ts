import { defineConfig, devices } from '@playwright/test';

/** Not 3000, so a running `next dev` doesn't get mistaken for the test server. */
const PORT = 3100;

const isCI = Boolean(process.env.CI);

// CI builds in its own step before the e2e step; building again here would
// double the job's longest step. Locally the server builds first, so the tests
// always run against the current code.
const startServer = `npx next start --port ${PORT}`;
const command = process.env.PLAYWRIGHT_SKIP_BUILD
  ? startServer
  : `npx next build && ${startServer}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Several browsers loading the app's largest chunks at once on a small
  // runner starved each other badly enough (30s+ page loads) to time out.
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command,
    url: `http://localhost:${PORT}/draft`,
    reuseExistingServer: !isCI,
    // A cold production build takes a while.
    timeout: 300_000,
    stdout: 'pipe',
  },
});
