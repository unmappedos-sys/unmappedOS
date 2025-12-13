/**
 * Safe Corridors E2E Test
 * 
 * Tests vitality-based safe route calculation.
 */

import { test, expect } from '@playwright/test';

test.describe('Safe Corridors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login
    await page.fill('input[type="email"]', 'test@unmapped.test');
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForURL('/dashboard');
  });

  test('should display safe corridor overlay', async ({ page }) => {
    // Navigate to map
    await page.goto('/map');
    
    // Wait for map to load
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    
    // Open safe corridor tool
    await page.click('button[aria-label="Safe Corridors"]');
    
    // Set destination
    await page.fill('input[placeholder="Enter destination"]', 'Test Zone Alpha');
    await page.click('button:has-text("Calculate Route")');
    
    // Wait for corridor to render
    await page.waitForSelector('[data-testid="corridor-overlay"]', { timeout: 5000 });
    
    // Check vitality indicators
    const vitalityScore = await page.textContent('[data-testid="vitality-score"]');
    expect(parseFloat(vitalityScore || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(vitalityScore || '0')).toBeLessThanOrEqual(10);
  });

  test('should show night mode warnings', async ({ page }) => {
    // Set system time to night (22:00)
    await page.evaluate(() => {
      const now = new Date();
      now.setHours(22, 0, 0, 0);
      Date.now = () => now.getTime();
    });
    
    await page.goto('/map');
    await page.waitForSelector('.mapboxgl-canvas');
    
    await page.click('button[aria-label="Safe Corridors"]');
    await page.fill('input[placeholder="Enter destination"]', 'Test Zone Beta');
    await page.click('button:has-text("Calculate Route")');
    
    // Check for night warnings
    const warnings = await page.textContent('[data-testid="corridor-warnings"]');
    expect(warnings).toContain('night');
  });

  test('should provide alternative routes', async ({ page }) => {
    await page.goto('/map');
    await page.waitForSelector('.mapboxgl-canvas');
    
    await page.click('button[aria-label="Safe Corridors"]');
    await page.fill('input[placeholder="Enter destination"]', 'Test Zone Gamma');
    await page.click('button:has-text("Calculate Route")');
    
    // Wait for alternatives
    await page.waitForSelector('[data-testid="alternative-routes"]', { timeout: 5000 });
    
    const alternatives = await page.locator('[data-testid="alternative-route"]').count();
    expect(alternatives).toBeGreaterThanOrEqual(1);
    expect(alternatives).toBeLessThanOrEqual(3);
  });
});
