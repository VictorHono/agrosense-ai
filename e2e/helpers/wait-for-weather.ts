import { Page, expect } from '@playwright/test';

/**
 * Wait for weather widget to fully load
 * @param page Playwright page instance
 * @param timeout Maximum wait time in ms (default: 15000)
 */
export async function waitForWeatherWidget(page: Page, timeout = 15000): Promise<void> {
  // Wait for temperature display
  await expect(
    page.getByText(/°C/i).or(page.getByText(/température/i))
  ).toBeVisible({ timeout });
}

/**
 * Wait for permission error UI to appear
 * @param page Playwright page instance
 * @param timeout Maximum wait time in ms (default: 10000)
 */
export async function waitForPermissionError(page: Page, timeout = 10000): Promise<void> {
  await expect(
    page.getByText(/localisation requise/i).or(page.getByText(/autorisez l'accès/i))
  ).toBeVisible({ timeout });
}

/**
 * Check that no geolocation-related JS errors occurred
 * @param page Playwright page instance
 */
export async function checkNoGeoErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  
  page.on('pageerror', (error) => {
    if (error.message.toLowerCase().includes('geolocation') ||
        error.message.toLowerCase().includes('position') ||
        error.message.toLowerCase().includes('navigator')) {
      errors.push(error.message);
    }
  });
  
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    throw new Error(`Geolocation errors detected: ${errors.join(', ')}`);
  }
}

/**
 * Verify weather widget displays correct region
 * @param page Playwright page instance
 * @param regionPatterns Array of regex patterns to match (e.g., /yaoundé/i, /centre/i)
 */
export async function verifyRegionDisplay(page: Page, regionPatterns: RegExp[]): Promise<void> {
  const combinedLocator = regionPatterns.reduce(
    (acc, pattern, idx) => idx === 0 ? page.getByText(pattern) : acc.or(page.getByText(pattern)),
    page.getByText(regionPatterns[0])
  );
  
  await expect(combinedLocator).toBeVisible({ timeout: 5000 });
}

/**
 * Select a city from the manual dropdown
 * @param page Playwright page instance
 * @param cityName City name to select
 */
export async function selectManualCity(page: Page, cityName: string): Promise<void> {
  // Click on city selector
  const citySelector = page.getByRole('combobox').first();
  await citySelector.click();
  
  // Select the city
  await page.getByRole('option', { name: new RegExp(cityName, 'i') }).or(
    page.getByText(new RegExp(cityName, 'i')).first()
  ).click();
  
  // Wait for weather to load
  await waitForWeatherWidget(page);
}

/**
 * Click the retry GPS button
 * @param page Playwright page instance
 */
export async function clickRetryGPS(page: Page): Promise<void> {
  const retryButton = page.getByRole('button', { name: /réessayer/i }).or(
    page.getByText(/réessayer gps/i)
  );
  await retryButton.click();
}
