import { test as base, expect } from '@playwright/test';

/**
 * Geolocation test fixtures for AgroCamer
 * Provides reusable test contexts with pre-configured geolocation settings
 */

// Cameroonian city coordinates
export const CAMEROON_CITIES = {
  yaounde: { latitude: 3.848, longitude: 11.5021, altitude: 726 },
  douala: { latitude: 4.0511, longitude: 9.7679, altitude: 13 },
  bamenda: { latitude: 5.9597, longitude: 10.1591, altitude: 1600 },
  garoua: { latitude: 9.3014, longitude: 13.3986, altitude: 244 },
  maroua: { latitude: 10.591, longitude: 14.3159, altitude: 405 },
  bafoussam: { latitude: 5.4737, longitude: 10.4179, altitude: 1450 },
  ngaoundere: { latitude: 7.3167, longitude: 13.5833, altitude: 1102 },
  bertoua: { latitude: 4.5833, longitude: 13.6833, altitude: 672 },
  ebolowa: { latitude: 2.9, longitude: 11.15, altitude: 613 },
  kribi: { latitude: 2.9333, longitude: 9.9, altitude: 10 },
} as const;

// Climate zones in Cameroon
export const CLIMATE_ZONES = {
  sahel: { lat: 10.591, name: 'Sahélienne' },
  sudanoSahel: { lat: 9.3, name: 'Soudano-sahélienne' },
  guineaSavannah: { lat: 7.3, name: 'Guinéenne de savane' },
  highlands: { lat: 5.96, altMin: 1000, name: 'Hautes terres' },
  equatorialForest: { lat: 3.8, name: 'Forestière équatoriale' },
  coastal: { lat: 4.05, coastal: true, name: 'Côtière' },
} as const;

// Storage keys used by the app
export const STORAGE_KEYS = {
  cache: 'agrocamer_geo_cache',
  manual: 'agrocamer_manual_location',
} as const;

/**
 * Extended test fixture with geolocation helpers
 */
export const test = base.extend<{
  geoHelpers: {
    clearStorage: () => Promise<void>;
    setCachedPosition: (coords: { latitude: number; longitude: number; altitude?: number }) => Promise<void>;
    setManualLocation: (coords: { latitude: number; longitude: number; altitude?: number }) => Promise<void>;
    getStorage: () => Promise<{ cache: string | null; manual: string | null }>;
    grantPermission: () => Promise<void>;
    denyPermission: () => Promise<void>;
    setLocation: (cityName: keyof typeof CAMEROON_CITIES) => Promise<void>;
  };
}>({
  geoHelpers: async ({ page, context }, use) => {
    const helpers = {
      async clearStorage() {
        await page.evaluate((keys) => {
          localStorage.removeItem(keys.cache);
          localStorage.removeItem(keys.manual);
        }, STORAGE_KEYS);
      },

      async setCachedPosition(coords: { latitude: number; longitude: number; altitude?: number }) {
        await page.evaluate(({ coords, key }) => {
          localStorage.setItem(key, JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            altitude: coords.altitude ?? null,
            accuracy: 50,
          }));
        }, { coords, key: STORAGE_KEYS.cache });
      },

      async setManualLocation(coords: { latitude: number; longitude: number; altitude?: number }) {
        await page.evaluate(({ coords, key }) => {
          localStorage.setItem(key, JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            altitude: coords.altitude ?? null,
          }));
        }, { coords, key: STORAGE_KEYS.manual });
      },

      async getStorage() {
        return await page.evaluate((keys) => ({
          cache: localStorage.getItem(keys.cache),
          manual: localStorage.getItem(keys.manual),
        }), STORAGE_KEYS);
      },

      async grantPermission() {
        await context.grantPermissions(['geolocation']);
      },

      async denyPermission() {
        await context.clearPermissions();
      },

      async setLocation(cityName: keyof typeof CAMEROON_CITIES) {
        const coords = CAMEROON_CITIES[cityName];
        await context.setGeolocation(coords);
      },
    };

    await use(helpers);
  },
});

export { expect };
