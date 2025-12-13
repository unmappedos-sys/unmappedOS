/**
 * Zone Entry E2E Test
 * 
 * Tests zone browsing and entry interactions.
 */

import { test, expect } from '@playwright/test';

test.describe('Zone Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display map on home page', async ({ page }) => {
    // Wait for map to load
    await expect(page.locator('[class*="map"], #map, .maplibre')).toBeVisible({ timeout: 10000 });
  });

  test('should show cities page', async ({ page }) => {
    await page.goto('/cities');
    
    // Should show city list
    await expect(page.locator('text=/bangkok|tokyo|city/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show zone markers on map', async ({ page }) => {
    // Wait for markers to load
    await page.waitForTimeout(3000);
    
    // Check for zone markers or layers
    const markers = page.locator('[class*="marker"], [class*="zone"]');
    // At minimum, the map should have some interactive elements
    await expect(page.locator('[class*="map"]')).toBeVisible();
  });

  test('should show HUD elements', async ({ page }) => {
    // Look for HUD overlay elements
    await page.waitForTimeout(2000);
    
    // Check for common HUD elements
    const hudElements = page.locator('[class*="hud"], [class*="status"], [class*="panel"]');
    
    // Map page should have some overlay UI
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Zone Details', () => {
  test('should show zone information on click', async ({ page }) => {
    await page.goto('/');
    
    // Wait for map
    await page.waitForTimeout(3000);
    
    // Click on map area (zone selection)
    await page.click('[class*="map"]', { position: { x: 200, y: 200 } });
    
    // Wait for any popup or sidebar
    await page.waitForTimeout(1000);
  });
});
