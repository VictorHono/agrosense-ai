# Playwright E2E Tests for AgroCamer Geolocation

## Overview

This directory contains end-to-end tests for the AgroCamer geolocation system, validating GPS functionality across all major browsers (Chrome, Firefox, Safari) with various permission states.

## Test Scenarios

### 1. Permission Granted Tests
- GPS position acquisition and display
- Weather widget rendering with location data
- Position caching in localStorage
- Location updates on significant coordinate changes

### 2. Permission Denied Tests
- Permission error UI display
- Manual city selection fallback
- Retry button functionality
- Persistence of manual selections

### 3. Cache Functionality Tests
- Cached position usage when GPS unavailable
- GPS priority over cache when available
- Manual location override of cache

### 4. Cross-Browser Compatibility
- Chrome, Firefox, Safari (WebKit)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### 5. Altitude & Climate Zone Tests
- Altitude display when available
- Climate zone detection based on coordinates

## Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run specific browser tests
npx playwright test --project=chromium-geo-granted

# Run tests with UI mode
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Generate and view HTML report
npx playwright show-report
```

## Test Configuration

Tests are configured in `playwright.config.ts` with the following projects:

| Project | Browser | Permission | Location |
|---------|---------|------------|----------|
| `chromium-geo-granted` | Chrome | Granted | Yaoundé |
| `chromium-geo-denied` | Chrome | Denied | - |
| `firefox-geo-granted` | Firefox | Granted | Douala |
| `firefox-geo-denied` | Firefox | Denied | - |
| `webkit-geo-granted` | Safari | Granted | Bamenda |
| `webkit-geo-denied` | Safari | Denied | - |
| `mobile-chrome` | Android Chrome | Granted | Yaoundé |
| `mobile-safari` | iOS Safari | Granted | Douala |

## Key Files

- `e2e/geolocation.spec.ts` - Main test file
- `e2e/fixtures/geolocation.fixtures.ts` - Reusable test fixtures
- `e2e/helpers/wait-for-weather.ts` - Helper functions
- `playwright.config.ts` - Playwright configuration

## Cameroonian Cities Used

| City | Coordinates | Region | Climate Zone |
|------|-------------|--------|--------------|
| Yaoundé | 3.848, 11.502 | Centre | Forestière équatoriale |
| Douala | 4.051, 9.768 | Littoral | Côtière |
| Bamenda | 5.960, 10.159 | Nord-Ouest | Hautes terres |

## Storage Keys

- `agrocamer_geo_cache` - Cached GPS position
- `agrocamer_manual_location` - Manual city selection

## Notes

1. **Browser Permission Prompt**: On first run in headed mode, browsers will show the geolocation permission prompt. Tests configure permissions programmatically.

2. **Timeout Considerations**: Weather API calls may take time. Default timeout is 15 seconds for weather widget visibility.

3. **CI/CD Integration**: Tests run in headless mode in CI environments. Failed test screenshots and traces are saved for debugging.
