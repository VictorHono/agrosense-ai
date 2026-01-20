import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for AgroCamer E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Chrome with geolocation permission granted
    {
      name: 'chromium-geo-granted',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['geolocation'],
        geolocation: { latitude: 3.848, longitude: 11.5021, accuracy: 50 }, // Yaoundé
      },
    },
    // Chrome with geolocation permission denied (no permissions array)
    {
      name: 'chromium-geo-denied',
      use: {
        ...devices['Desktop Chrome'],
        permissions: [], // No geolocation permission
      },
    },
    // Firefox with geolocation permission granted
    {
      name: 'firefox-geo-granted',
      use: {
        ...devices['Desktop Firefox'],
        permissions: ['geolocation'],
        geolocation: { latitude: 4.0511, longitude: 9.7679, accuracy: 50 }, // Douala
      },
    },
    // Firefox with geolocation permission denied
    {
      name: 'firefox-geo-denied',
      use: {
        ...devices['Desktop Firefox'],
        permissions: [],
      },
    },
    // Safari/WebKit with geolocation permission granted
    {
      name: 'webkit-geo-granted',
      use: {
        ...devices['Desktop Safari'],
        permissions: ['geolocation'],
        geolocation: { latitude: 5.9597, longitude: 10.1591, accuracy: 50 }, // Bamenda
      },
    },
    // Safari/WebKit with geolocation permission denied
    {
      name: 'webkit-geo-denied',
      use: {
        ...devices['Desktop Safari'],
        permissions: [],
      },
    },
    // Mobile Chrome
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        permissions: ['geolocation'],
        geolocation: { latitude: 3.848, longitude: 11.5021, accuracy: 50 },
      },
    },
    // Mobile Safari
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        permissions: ['geolocation'],
        geolocation: { latitude: 4.0511, longitude: 9.7679, accuracy: 50 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
