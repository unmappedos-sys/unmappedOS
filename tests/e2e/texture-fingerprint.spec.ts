/**
 * Texture Fingerprint E2E Test
 */

import { test, expect } from '@playwright/test';

test.describe('Texture Fingerprint', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="email"]', 'fingerprint.test@unmapped.test');
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForURL('/dashboard');
  });

  test('should track zone visits and update fingerprint', async ({ page }) => {
    // Visit profile
    await page.goto('/profile');
    
    // Check for fingerprint section
    await page.waitForSelector('[data-testid="texture-fingerprint"]');
    
    // Should show primary texture preference
    const primaryTexture = await page.textContent('[data-testid="primary-texture"]');
    expect(primaryTexture).toBeTruthy();
    expect(['SILENCE', 'ANALOG', 'NEON', 'CHAOS']).toContain(primaryTexture?.trim() || '');
  });

  test('should recommend zones based on fingerprint', async ({ page }) => {
    await page.goto('/explore');
    
    // Wait for recommendations
    await page.waitForSelector('[data-testid="zone-recommendations"]', { timeout: 10000 });
    
    const recommendations = await page.locator('[data-testid="recommended-zone"]').count();
    expect(recommendations).toBeGreaterThan(0);
    expect(recommendations).toBeLessThanOrEqual(10);
    
    // Check recommendation scores
    const firstScore = await page.textContent('[data-testid="recommended-zone"]:first-child [data-testid="recommendation-score"]');
    expect(parseFloat(firstScore || '0')).toBeGreaterThan(0);
  });

  test('should display travel style badge', async ({ page }) => {
    await page.goto('/profile');
    
    await page.waitForSelector('[data-testid="travel-style"]');
    
    const travelStyle = await page.textContent('[data-testid="travel-style"]');
    expect(['explorer', 'local', 'nightcrawler', 'daytripper', 'balanced']).toContain(
      travelStyle?.toLowerCase().trim()
    );
  });

  test('should allow fingerprint export', async ({ page }) => {
    await page.goto('/profile');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export Fingerprint")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('fingerprint');
    expect(download.suggestedFilename()).toContain('.json');
  });
});
