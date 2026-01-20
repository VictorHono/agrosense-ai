import { test, expect, Page } from '@playwright/test';

/**
 * AgroCamer E2E Geolocation Tests
 * 
 * Tests cover:
 * 1. GPS permission granted - weather widget displays location data
 * 2. GPS permission denied - fallback UI with manual city selection
 * 3. Manual location selection - persists in localStorage
 * 4. Cache functionality - cached position used when available
 * 5. Cross-browser compatibility - Chrome, Firefox, Safari
 */

// Test data for Cameroonian cities
const YAOUNDE_COORDS = { latitude: 3.848, longitude: 11.5021, altitude: 726 };
const DOUALA_COORDS = { latitude: 4.0511, longitude: 9.7679, altitude: 13 };
const BAMENDA_COORDS = { latitude: 5.9597, longitude: 10.1591, altitude: 1600 };

/**
 * Helper to clear localStorage geolocation data
 */
async function clearGeoStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('agrocamer_geo_cache');
    localStorage.removeItem('agrocamer_manual_location');
  });
}

/**
 * Helper to set cached position in localStorage
 */
async function setCachedPosition(page: Page, coords: { latitude: number; longitude: number; altitude?: number }) {
  await page.evaluate((c) => {
    localStorage.setItem('agrocamer_geo_cache', JSON.stringify({
      latitude: c.latitude,
      longitude: c.longitude,
      altitude: c.altitude ?? null,
      accuracy: 50,
    }));
  }, coords);
}

/**
 * Helper to set manual location in localStorage
 */
async function setManualLocation(page: Page, coords: { latitude: number; longitude: number; altitude?: number }) {
  await page.evaluate((c) => {
    localStorage.setItem('agrocamer_manual_location', JSON.stringify({
      latitude: c.latitude,
      longitude: c.longitude,
      altitude: c.altitude ?? null,
    }));
  }, coords);
}

/**
 * Helper to get localStorage geolocation data
 */
async function getGeoStorage(page: Page) {
  return await page.evaluate(() => ({
    cache: localStorage.getItem('agrocamer_geo_cache'),
    manual: localStorage.getItem('agrocamer_manual_location'),
  }));
}

// ============ TESTS WITH PERMISSION GRANTED ============

test.describe('Geolocation - Permission Granted', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission for this context
    await context.grantPermissions(['geolocation']);
    await clearGeoStorage(page);
  });

  test('should display weather widget with GPS location @chromium-geo-granted @firefox-geo-granted @webkit-geo-granted', async ({ page, context }) => {
    // Set geolocation to Yaoundé
    await context.setGeolocation(YAOUNDE_COORDS);
    
    await page.goto('/');
    
    // Wait for weather widget to load
    const weatherWidget = page.locator('[data-testid="weather-widget"]').or(
      page.getByText(/météo/i).first()
    );
    
    // Should show weather data, not permission error
    await expect(page.getByText(/localisation requise/i)).not.toBeVisible({ timeout: 10000 });
    
    // Should display temperature or weather condition
    await expect(
      page.getByText(/°C/i).or(page.getByText(/température/i))
    ).toBeVisible({ timeout: 15000 });
    
    // Should indicate GPS source or show region name
    await expect(
      page.getByText(/yaoundé/i).or(page.getByText(/centre/i)).or(page.getByText(/gps/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should cache GPS position in localStorage @chromium-geo-granted', async ({ page, context }) => {
    await context.setGeolocation(YAOUNDE_COORDS);
    await page.goto('/');
    
    // Wait for weather to load (indicates GPS success)
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
    
    // Check localStorage for cached position
    const storage = await getGeoStorage(page);
    expect(storage.cache).not.toBeNull();
    
    const cached = JSON.parse(storage.cache!);
    expect(cached.latitude).toBeCloseTo(YAOUNDE_COORDS.latitude, 1);
    expect(cached.longitude).toBeCloseTo(YAOUNDE_COORDS.longitude, 1);
  });

  test('should update when location changes significantly @chromium-geo-granted', async ({ page, context }) => {
    // Start in Yaoundé
    await context.setGeolocation(YAOUNDE_COORDS);
    await page.goto('/');
    
    await expect(page.getByText(/°C/i)).toBeVisible({ timeout: 15000 });
    
    // Move to Douala
    await context.setGeolocation(DOUALA_COORDS);
    
    // Wait for refresh or manually trigger
    await page.waitForTimeout(2000);
    
    // Should reflect new location (Littoral region or Douala)
    await expect(
      page.getByText(/douala/i).or(page.getByText(/littoral/i))
    ).toBeVisible({ timeout: 10000 });
  });
});

// ============ TESTS WITH PERMISSION DENIED ============

test.describe('Geolocation - Permission Denied', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear permissions to simulate denial
    await context.clearPermissions();
    await clearGeoStorage(page);
  });

  test('should show permission request UI @chromium-geo-denied @firefox-geo-denied @webkit-geo-denied', async ({ page }) => {
    await page.goto('/');
    
    // Should show permission request message
    await expect(
      page.getByText(/localisation requise/i).or(page.getByText(/autorisez l'accès/i))
    ).toBeVisible({ timeout: 10000 });
    
    // Should show retry button
    await expect(
      page.getByRole('button', { name: /réessayer/i }).or(page.getByText(/réessayer gps/i))
    ).toBeVisible();
    
    // Should show manual city selection dropdown
    await expect(
      page.getByRole('combobox').or(page.getByText(/sélectionner une ville/i))
    ).toBeVisible();
  });

  test('should allow manual city selection @chromium-geo-denied', async ({ page }) => {
    await page.goto('/');
    
    // Wait for permission error UI
    await expect(page.getByText(/localisation requise/i)).toBeVisible({ timeout: 10000 });
    
    // Click on city selector dropdown
    const citySelector = page.getByRole('combobox').first();
    await citySelector.click();
    
    // Select Douala
    await page.getByRole('option', { name: /douala/i }).or(
      page.getByText(/douala/i).first()
    ).click();
    
    // Wait for weather to load with manual location
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
    
    // Should show manual source indicator
    await expect(
      page.getByText(/manuel/i).or(page.getByText(/douala/i))
    ).toBeVisible({ timeout: 5000 });
    
    // Should persist in localStorage
    const storage = await getGeoStorage(page);
    expect(storage.manual).not.toBeNull();
    
    const manual = JSON.parse(storage.manual!);
    expect(manual.latitude).toBeCloseTo(DOUALA_COORDS.latitude, 1);
  });

  test('should persist manual selection after page reload @chromium-geo-denied', async ({ page }) => {
    // Pre-set manual location
    await page.goto('/');
    await setManualLocation(page, DOUALA_COORDS);
    
    // Reload page
    await page.reload();
    
    // Should immediately show weather (not permission error)
    await expect(page.getByText(/localisation requise/i)).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
  });

  test('retry button should trigger browser permission prompt @chromium-geo-denied', async ({ page }) => {
    await page.goto('/');
    
    // Wait for permission error UI
    await expect(page.getByText(/localisation requise/i)).toBeVisible({ timeout: 10000 });
    
    // Get the retry button
    const retryButton = page.getByRole('button', { name: /réessayer/i }).or(
      page.getByText(/réessayer gps/i)
    );
    await expect(retryButton).toBeVisible();
    
    // Clicking should attempt to get position (may fail if permission truly denied)
    // We're mainly checking the button works and triggers the flow
    await retryButton.click();
    
    // Should still show UI since permission is denied
    // But the attempt was made (no JS errors)
    await expect(page).toHaveURL('/');
  });
});

// ============ CACHE FUNCTIONALITY TESTS ============

test.describe('Geolocation - Cache Functionality', () => {
  test('should use cached position when GPS unavailable @chromium-geo-denied', async ({ page, context }) => {
    // Clear permissions
    await context.clearPermissions();
    
    // Pre-set cached position
    await page.goto('/');
    await setCachedPosition(page, BAMENDA_COORDS);
    
    // Reload to use cache
    await page.reload();
    
    // Should show weather from cached position (not permission error)
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
    
    // Should indicate cache source
    await expect(
      page.getByText(/cache/i).or(page.getByText(/bamenda/i)).or(page.getByText(/nord-ouest/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should prefer GPS over cache when available @chromium-geo-granted', async ({ page, context }) => {
    // Grant permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(YAOUNDE_COORDS);
    
    // Pre-set cache with different location
    await page.goto('/');
    await setCachedPosition(page, DOUALA_COORDS);
    
    // Reload
    await page.reload();
    
    // Wait for GPS to update
    await page.waitForTimeout(3000);
    
    // Should show Yaoundé (GPS) not Douala (cache)
    await expect(
      page.getByText(/yaoundé/i).or(page.getByText(/centre/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('manual location should override cache @chromium-geo-denied', async ({ page, context }) => {
    await context.clearPermissions();
    
    // Pre-set both cache and manual
    await page.goto('/');
    await setCachedPosition(page, BAMENDA_COORDS);
    await setManualLocation(page, DOUALA_COORDS);
    
    // Reload
    await page.reload();
    
    // Should show Douala (manual) not Bamenda (cache)
    await expect(
      page.getByText(/douala/i).or(page.getByText(/littoral/i))
    ).toBeVisible({ timeout: 10000 });
  });
});

// ============ CROSS-BROWSER COMPATIBILITY ============

test.describe('Geolocation - Cross-Browser Compatibility', () => {
  test('weather widget renders correctly on all browsers @chromium-geo-granted @firefox-geo-granted @webkit-geo-granted', async ({ page, context, browserName }) => {
    await context.grantPermissions(['geolocation']);
    
    const coords = browserName === 'firefox' ? DOUALA_COORDS : 
                   browserName === 'webkit' ? BAMENDA_COORDS : YAOUNDE_COORDS;
    await context.setGeolocation(coords);
    
    await page.goto('/');
    
    // Weather widget should be visible
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
    
    // No JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    
    await page.waitForTimeout(2000);
    expect(errors.filter(e => e.includes('geolocation'))).toHaveLength(0);
  });

  test('manual selection works on all browsers @chromium-geo-denied @firefox-geo-denied @webkit-geo-denied', async ({ page, context }) => {
    await context.clearPermissions();
    
    await page.goto('/');
    
    // Set manual location
    await setManualLocation(page, YAOUNDE_COORDS);
    await page.reload();
    
    // Should work regardless of browser
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
  });
});

// ============ MOBILE-SPECIFIC TESTS ============

test.describe('Geolocation - Mobile Devices', () => {
  test('should handle mobile viewport correctly @mobile-chrome @mobile-safari', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');
    
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(YAOUNDE_COORDS);
    
    await page.goto('/');
    
    // Weather widget should be visible and responsive
    await expect(page.getByText(/°C/i).or(page.getByText(/température/i))).toBeVisible({ timeout: 15000 });
    
    // Check weather widget is not cut off
    const viewport = page.viewportSize();
    const widget = page.locator('[data-testid="weather-widget"]').or(
      page.getByText(/météo/i).first().locator('..')
    );
    
    if (await widget.isVisible()) {
      const box = await widget.boundingBox();
      if (box && viewport) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
});

// ============ ALTITUDE AND CLIMATE ZONE TESTS ============

test.describe('Geolocation - Altitude & Climate Zone', () => {
  test('should display altitude when available @chromium-geo-granted', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ ...BAMENDA_COORDS, altitude: 1600 });
    
    await page.goto('/');
    
    // Wait for weather
    await expect(page.getByText(/°C/i)).toBeVisible({ timeout: 15000 });
    
    // Should show altitude info (Bamenda is in highlands at 1600m)
    await expect(
      page.getByText(/1600/i).or(page.getByText(/altitude/i)).or(page.getByText(/hautes terres/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should detect correct climate zone @chromium-geo-granted', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    // Bamenda coordinates (highlands zone)
    await context.setGeolocation({ latitude: 5.9597, longitude: 10.1591, altitude: 1600 });
    
    await page.goto('/');
    
    await expect(page.getByText(/°C/i)).toBeVisible({ timeout: 15000 });
    
    // Should show highlands climate characteristics
    await expect(
      page.getByText(/hautes terres/i).or(page.getByText(/nord-ouest/i))
    ).toBeVisible({ timeout: 5000 });
  });
});
