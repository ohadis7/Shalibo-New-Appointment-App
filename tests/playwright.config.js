// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Serves the repo root over HTTP so `landing.html` loads the same way it does
 * in the container. Screenshots land in `test-results/` and are uploaded as a
 * CI artifact so a human can eyeball a change without reading a CSS diff.
 */
module.exports = defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'mobile',  use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 812 } } },
    { name: 'tablet',  use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],

  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory ..',
    url: 'http://127.0.0.1:4173/landing.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
