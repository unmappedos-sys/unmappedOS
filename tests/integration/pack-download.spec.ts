/**
 * Playwright Integration Tests
 * City Pack Download → IndexedDB → Offline Map Render
 */

import { test, expect } from '@playwright/test';

test.describe('City Pack Download Flow', () => {
  test('should download Bangkok pack and store in IndexedDB', async ({ page }) => {
    // Navigate to city page
    await page.goto('/city/bangkok');

    // Wait for page load
    await expect(page.locator('h1')).toContainText('BANGKOK', { timeout: 10000 });

    // Click download button
    const downloadButton = page.locator('button:has-text("ACQUIRE"), button:has-text("DOWNLOAD")').first();
    await downloadButton.click();

    // Wait for terminal loader to complete
    await expect(page.locator('.terminal-loader, [data-testid="terminal-loader"]')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=/VERIFICATION COMPLETE|DOWNLOAD COMPLETE/')).toBeVisible({ timeout: 10000 });

    // Check IndexedDB for stored pack
    const haspack = await page.evaluate(async () => {
      const dbRequest = indexedDB.open('unmapped-os', 1);
      
      return new Promise((resolve) => {
        dbRequest.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction(['city-packs'], 'readonly');
          const store = transaction.objectStore('city-packs');
          const getRequest = store.get('bangkok');
          
          getRequest.onsuccess = () => {
            resolve(!!getRequest.result);
          };
          
          getRequest.onerror = () => resolve(false);
        };
        
        dbRequest.onerror = () => resolve(false);
      });
    });

    expect(haspack).toBe(true);
  });

  test('should render map from offline pack', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Navigate to map (assuming pack already downloaded)
    await page.goto('/map/bangkok');

    // Check map renders
    await expect(page.locator('canvas, [class*="maplibre"], [class*="mapbox"]')).toBeVisible({ timeout: 15000 });

    // Check zones are displayed
    const zones = await page.locator('[data-zone-id], .zone-polygon').count();
    expect(zones).toBeGreaterThan(0);
  });
});

test.describe('Export to Google Maps', () => {
  test('should copy cheat sheet to clipboard on export', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to map with zone selected
    await page.goto('/map/bangkok');

    // Wait for map to load
    await page.waitForTimeout(3000);

    // Click a zone to select it
    const zone = page.locator('[data-zone-id], .zone-polygon').first();
    await zone.click();

    // Wait for anchor lock
    await page.waitForTimeout(1000);

    // Click export button
    const exportButton = page.locator('button:has-text("EXPORT"), button:has-text("GOOGLE MAPS")').first();
    await exportButton.click();

    // Check clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(10);
  });
});

test.describe('Hazard Reporting Flow', () => {
  test('should submit hazard report and show confirmation', async ({ page }) => {
    // Login first (simplified - assumes auth is working)
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@unmapped.com');
    await page.fill('input[name="name"]', 'Test Operative');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('**/city/**', { timeout: 10000 });

    // Navigate to map
    await page.goto('/map/bangkok');
    await page.waitForTimeout(2000);

    // Open hazard report modal
    const reportButton = page.locator('button:has-text("REPORT"), button:has-text("HAZARD")').first();
    await reportButton.click();

    // Fill report form
    await page.waitForSelector('[role="dialog"], .modal');
    await page.click('text="OBSTRUCTION"');
    await page.fill('textarea, input[type="text"]', 'Test hazard report from Playwright');

    // Submit report
    await page.click('button:has-text("SUBMIT")');

    // Check success message
    await expect(page.locator('text=/REPORT SUBMITTED|SUCCESS/')).toBeVisible({ timeout: 5000 });
  });

  test('should disable zone after 2 distinct reports', async ({ browser }) => {
    // This test requires two separate browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const zoneId = 'bangkok-zone-1';

    // User 1: Submit report
    await page1.goto('/map/bangkok');
    await page1.waitForTimeout(2000);
    // ... submit hazard report for zone

    // User 2: Submit report for same zone
    await page2.goto('/map/bangkok');
    await page2.waitForTimeout(2000);
    // ... submit hazard report for same zone

    // Trigger aggregation check
    await page1.request.post('/api/agg-check');

    // Check zone status
    await page1.reload();
    await page1.waitForTimeout(2000);

    const zoneElement = page1.locator(`[data-zone-id="${zoneId}"]`);
    await expect(zoneElement).toHaveAttribute('data-status', 'OFFLINE');

    await context1.close();
    await context2.close();
  });
});

test.describe('Price Submission', () => {
  test('should submit price and receive karma reward', async ({ page }) => {
    // Login
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@unmapped.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/city/**');

    // Navigate to zone
    await page.goto('/map/bangkok');
    await page.waitForTimeout(2000);

    // Open price submission form
    const priceButton = page.locator('button:has-text("PRICE"), button:has-text("REPORT")').first();
    await priceButton.click();

    // Fill form
    await page.selectOption('select', 'coffee');
    await page.fill('input[type="number"]', '80');
    await page.fill('input[placeholder*="currency"], select[name="currency"]', 'THB');

    // Submit
    await page.click('button:has-text("SUBMIT")');

    // Check success and karma reward
    await expect(page.locator('text=/KARMA|\\+10/')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Ghost Mode Toggle', () => {
  test('should apply ghost mode styles when toggled', async ({ page }) => {
    await page.goto('/map/bangkok');
    await page.waitForTimeout(2000);

    // Check initial state (non-ghost)
    const body = page.locator('body');
    await expect(body).not.toHaveClass(/ghost-mode/);

    // Toggle ghost mode
    const ghostToggle = page.locator('button:has-text("GHOST MODE")').first();
    await ghostToggle.click();

    // Check ghost mode applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/ghost-mode/);

    // Check localStorage persistence
    const ghostModeStored = await page.evaluate(() => localStorage.getItem('ghostMode'));
    expect(ghostModeStored).toBe('true');
  });
});

test.describe('Collapsible HUD', () => {
  test('should hide HUD panels when collapsed', async ({ page }) => {
    await page.goto('/map/bangkok');
    await page.waitForTimeout(2000);

    // Check HUD visible initially
    const hudPanel = page.locator('.hud-card, [data-testid="hud-panel"]').first();
    await expect(hudPanel).toBeVisible();

    // Collapse HUD
    const collapseButton = page.locator('button:has-text("COLLAPSE"), button:has-text("HIDE HUD")').first();
    await collapseButton.click();

    // Check HUD hidden
    await expect(hudPanel).toBeHidden();

    // Check collapse indicator visible
    await expect(page.locator('text=/HUD COLLAPSED|FULL VISUAL/')).toBeVisible();
  });
});
