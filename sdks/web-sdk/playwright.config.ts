import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AuthBridge Web SDK - Playwright Configuration
 * Upgraded: January 2026
 *
 * Environment-based configuration with standardized timeouts,
 * artifact capture, and parallel execution support.
 */

// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import 'dotenv/config';

// Environment configuration map
const envConfigMap = {
  local: {
    baseURL: 'http://localhost:9090',
    webServer: {
      command: 'pnpm example:standalone',
      url: 'http://127.0.0.1:9090',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  },
  staging: {
    baseURL: process.env.STAGING_URL || 'https://staging.authbridge.io',
    webServer: undefined,
  },
  production: {
    baseURL: process.env.PRODUCTION_URL || 'https://sdk.authbridge.io',
    webServer: undefined,
  },
};

const environment = (process.env.TEST_ENV || 'local') as keyof typeof envConfigMap;

// Fail fast if environment not supported
if (!Object.keys(envConfigMap).includes(environment)) {
  console.error(`❌ No configuration found for environment: ${environment}`);
  console.error(`   Available environments: ${Object.keys(envConfigMap).join(', ')}`);
  process.exit(1);
}

console.log(`✅ Running tests against: ${environment.toUpperCase()}`);

const envConfig = envConfigMap[environment];

export default defineConfig({
  testDir: './e2e',
  outputDir: path.resolve(__dirname, './test-results'),

  /* Parallel execution */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* Standardized timeouts */
  timeout: 60 * 1000, // Test timeout: 60s
  expect: {
    timeout: 10 * 1000, // Assertion timeout: 10s
  },

  /* Reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  /* Shared settings */
  use: {
    baseURL: envConfig.baseURL,

    /* Standardized timeouts */
    actionTimeout: 15 * 1000, // Action timeout: 15s
    navigationTimeout: 30 * 1000, // Navigation timeout: 30s

    /* Artifact capture (failure-only to save space) */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--use-file-for-fake-video-capture=./e2e/assets/selfie.mjpeg',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
            'media.gstreamer.enabled': false,
            'browser.cache.disk.enable': false,
            'browser.cache.disk.capacity': 0,
            'browser.cache.disk.smart_size.enabled': false,
            'browser.cache.disk.smart_size.first_run': false,
            'browser.sessionstore.resume_from_crash': false,
            'browser.startup.page': 0,
            'browser.startup.homepage': 'about:blank',
            'browser.startup.firstrunSkipsHomepage': false,
            'browser.shell.checkDefaultBrowser': false,
            'device.storage.enabled': false,
            'extensions.update.enabled': false,
            'app.update.enabled': false,
            'network.http.use-cache': false,
          },
        },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--use-file-for-fake-video-capture=./e2e/assets/selfie.mjpeg',
          ],
        },
      },
    },
  ],

  /* Web server (local only) */
  webServer: envConfig.webServer,
});
