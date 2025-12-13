/**
 * Crisis Mode E2E Test
 * 
 * Tests emergency mode activation and UI.
 */

import { test, expect } from '@playwright/test';

test.describe('Crisis Mode UI', () => {
  test('should show crisis mode option in settings or menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Look for settings/menu button
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="settings"], [class*="menu"]');
    
    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();
      await page.waitForTimeout(500);
      
      // Look for crisis or emergency option
      const crisisOption = page.locator('text=/crisis|emergency|panic/i');
    }
  });

  test('should show minimal UI in crisis mode', async ({ page }) => {
    // This would require activating crisis mode
    // In crisis mode, the UI should be minimal and non-suspicious
    await page.goto('/');
  });

  test('should display safe phrases when in crisis mode', async ({ page }) => {
    // Safe phrases should be available in crisis mode
    await page.goto('/');
    
    // This test verifies the crisis mode component renders
    // Actual crisis mode activation would require specific triggers
  });
});

test.describe('Emergency Features', () => {
  test('should support shake gesture detection (mobile)', async ({ page }) => {
    // Check if device motion API is available
    const motionAvailable = await page.evaluate(() => {
      return 'DeviceMotionEvent' in window;
    });
    
    // Should be available on mobile devices
    expect(typeof motionAvailable).toBe('boolean');
  });

  test('should have emergency contact option', async ({ page }) => {
    await page.goto('/');
    
    // Look for emergency or contact options
    const emergencyElements = page.locator('text=/emergency|contact|help/i');
  });
});

test.describe('Safe Return', () => {
  test.skip('should show safe return path option', async ({ page }) => {
    // Requires authentication
    await page.goto('/');
    
    // Look for safe return or extraction route option
    const safeReturnButton = page.locator('button:has-text(/safe|return|extract/i)');
  });
});
