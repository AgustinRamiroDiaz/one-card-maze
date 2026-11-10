// Records the demo clips in demo/demo.spec.js (make demo). Animations stay on, unlike the test config.
const { devices } = require('@playwright/test');
const base = require('./playwright.config.js');

const desktop = { width: 1280, height: 720 };
const phone = devices['Pixel 7'].viewport;

module.exports = {
  ...base,
  testDir: 'demo',
  fullyParallel: true,
  retries: 0,
  use: { ...base.use, reducedMotion: 'no-preference' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: desktop, video: { mode: 'on', size: desktop } } },
    { name: 'phone', use: { ...devices['Pixel 7'], video: { mode: 'on', size: phone } } },
  ],
};
