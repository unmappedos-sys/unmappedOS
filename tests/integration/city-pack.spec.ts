import { test, expect } from '@playwright/test';

test.describe('City Pack Download Flow', () => {
  test('should download Bangkok pack and show map offline', async ({ page, context }) => {
    // Go offline mode
    await context.setOffline(true);

    // Navigate to city dossier
    await page.goto('http://localhost:3000/city/bangkok');

    // Should show city info
    await expect(page.locator('h2:has-text("Bangkok")')).toBeVisible();

    // Click download button
    await page.click('button:has-text("DOWNLOAD")');

    // Wait for progress bar
    await expect(page.locator('text=DOWNLOADING')).toBeVisible();

    // Wait for completion (may take a few seconds in test)
    await expect(page.locator('text=PACK READY')).toBeVisible({ timeout: 10000 });

    // Should redirect to map
    await expect(page).toHaveURL(/\/map\/bangkok/);

    // Go online to verify map loads
    await context.setOffline(false);

    // Should show tactical display
    await expect(page.locator('text=Tactical Display')).toBeVisible();
  });

  test('should load pack from IndexedDB when offline', async ({ page, context }) => {
    // First, download the pack while online
    await page.goto('http://localhost:3000/city/bangkok');
    await page.click('button:has-text("DOWNLOAD")');
    await expect(page.locator('text=PACK READY')).toBeVisible({ timeout: 10000 });

    // Now go offline
    await context.setOffline(true);

    // Navigate to map page
    await page.goto('http://localhost:3000/map/bangkok');

    // Should still load from cache
    await expect(page.locator('text=Tactical Display')).toBeVisible();
  });
});

test.describe('Export to Google Maps', () => {
  test('should copy cheat sheet to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('http://localhost:3000/map/bangkok');

    // Wait for map to load
    await page.waitForSelector('.mapboxgl-canvas, .maplibregl-canvas', { timeout: 10000 });

    // Click on a zone
    const zoneLayer = page.locator('.mapboxgl-canvas, .maplibregl-canvas').first();
    await zoneLayer.click();

    // Click export button
    await page.click('button:has-text("EXPORT TO MAPS")');

    // Verify clipboard contains cheat sheet
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('UNMAPPED OS');
    expect(clipboardText).toContain('CHEAT SHEET');
    expect(clipboardText).toContain('EMERGENCY');
  });
});
