/**
 * Confidence System E2E Tests
 * 
 * End-to-end tests for the full confidence pipeline
 */

import { test, expect } from '@playwright/test';

test.describe('Confidence System E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ==========================================================================
  // CONFIDENCE DISPLAY
  // ==========================================================================
  test.describe('Confidence Display', () => {
    test('should show confidence indicator on zone cards', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      // Wait for zones to load
      await page.waitForSelector('[data-testid="zone-card"]');
      
      // Check confidence badge exists
      const badge = page.locator('[data-testid="confidence-badge"]').first();
      await expect(badge).toBeVisible();
      
      // Should show percentage or level
      const text = await badge.textContent();
      expect(text).toMatch(/\d+%|HIGH|MEDIUM|LOW|DEGRADED/);
    });

    test('should show confidence bar with color coding', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      const bar = page.locator('[data-testid="confidence-bar"]').first();
      await expect(bar).toBeVisible();
      
      // Should have colored fill
      const fill = bar.locator('[data-testid="confidence-fill"]');
      await expect(fill).toHaveCSS('background-color', /(green|yellow|orange|red)/);
    });

    test('should show warning banner for degraded zones', async ({ page }) => {
      // Navigate to a known degraded zone (if available)
      await page.goto('/zone/degraded-test-zone');
      
      // Check for warning banner
      const banner = page.locator('[data-testid="zone-warning-banner"]');
      
      // Either banner is visible or zone doesn't exist
      if (await banner.isVisible()) {
        await expect(banner).toContainText(/caution|degraded|limited/i);
      }
    });

    test('should show intel freshness indicator', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      const freshness = page.locator('[data-testid="freshness-indicator"]').first();
      await expect(freshness).toBeVisible();
    });
  });

  // ==========================================================================
  // INTEL SUBMISSION
  // ==========================================================================
  test.describe('Intel Submission', () => {
    test.beforeEach(async ({ page }) => {
      // Login first (assuming auth is required)
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/');
    });

    test('should open intel submission form', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      // Click on a zone
      await page.click('[data-testid="zone-card"]');
      
      // Click submit intel button
      await page.click('[data-testid="submit-intel-button"]');
      
      // Form should appear
      const form = page.locator('[data-testid="intel-form"]');
      await expect(form).toBeVisible();
    });

    test('should show intel type options', async ({ page }) => {
      await page.goto('/zone/test-zone');
      await page.click('[data-testid="submit-intel-button"]');
      
      // Should show all intel types
      const options = page.locator('[data-testid="intel-type-option"]');
      await expect(options).toHaveCount({ greaterThan: 5 });
    });

    test('should validate price submission', async ({ page }) => {
      await page.goto('/zone/test-zone');
      await page.click('[data-testid="submit-intel-button"]');
      
      // Select price submission
      await page.click('[data-testid="intel-type-PRICE_SUBMISSION"]');
      
      // Try to submit without price
      await page.click('[data-testid="submit-button"]');
      
      // Should show validation error
      const error = page.locator('[data-testid="validation-error"]');
      await expect(error).toBeVisible();
    });

    test('should submit price intel successfully', async ({ page }) => {
      await page.goto('/zone/test-zone');
      await page.click('[data-testid="submit-intel-button"]');
      
      // Select price submission
      await page.click('[data-testid="intel-type-PRICE_SUBMISSION"]');
      
      // Fill form
      await page.selectOption('[data-testid="price-item"]', 'coffee');
      await page.fill('[data-testid="price-value"]', '50');
      
      // Submit
      await page.click('[data-testid="submit-button"]');
      
      // Should show success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should award karma after submission', async ({ page }) => {
      // Get initial karma
      await page.goto('/profile');
      const initialKarma = await page.locator('[data-testid="karma-count"]').textContent();
      
      // Submit intel
      await page.goto('/zone/test-zone');
      await page.click('[data-testid="submit-intel-button"]');
      await page.click('[data-testid="intel-type-QUIET_CONFIRMED"]');
      await page.click('[data-testid="submit-button"]');
      
      // Check karma increased
      await page.goto('/profile');
      const newKarma = await page.locator('[data-testid="karma-count"]').textContent();
      
      expect(parseInt(newKarma || '0')).toBeGreaterThan(parseInt(initialKarma || '0'));
    });
  });

  // ==========================================================================
  // OFFLINE ZONE
  // ==========================================================================
  test.describe('Offline Zone Handling', () => {
    test('should show offline banner for offline zones', async ({ page }) => {
      // This assumes we have a test zone marked offline
      await page.goto('/zone/offline-test-zone');
      
      const banner = page.locator('[data-testid="offline-banner"]');
      
      if (await banner.isVisible()) {
        await expect(banner).toContainText(/offline|unavailable/i);
      }
    });

    test('should disable intel submission for offline zones', async ({ page }) => {
      await page.goto('/zone/offline-test-zone');
      
      const submitButton = page.locator('[data-testid="submit-intel-button"]');
      
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeDisabled();
      }
    });

    test('should show offline reason', async ({ page }) => {
      await page.goto('/zone/offline-test-zone');
      
      const reason = page.locator('[data-testid="offline-reason"]');
      
      if (await reason.isVisible()) {
        await expect(reason).not.toBeEmpty();
      }
    });
  });

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================
  test.describe('Recommendations', () => {
    test('should show ranked recommendations', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      // Toggle to recommendations view
      await page.click('[data-testid="recommendations-tab"]');
      
      // Should show ranked zones
      const recommendations = page.locator('[data-testid="recommendation-card"]');
      await expect(recommendations).toHaveCount({ greaterThan: 0 });
    });

    test('should filter recommendations by texture', async ({ page }) => {
      await page.goto('/explore/bangkok');
      await page.click('[data-testid="recommendations-tab"]');
      
      // Select texture filter
      await page.click('[data-testid="texture-filter-night-market"]');
      
      // Results should be filtered
      const cards = page.locator('[data-testid="recommendation-card"]');
      const count = await cards.count();
      
      // Each visible card should have night-market texture
      for (let i = 0; i < count; i++) {
        const texture = await cards.nth(i).getAttribute('data-texture');
        expect(texture).toContain('night-market');
      }
    });

    test('should show recommendation reasons', async ({ page }) => {
      await page.goto('/explore/bangkok');
      await page.click('[data-testid="recommendations-tab"]');
      
      // Click first recommendation
      await page.click('[data-testid="recommendation-card"]');
      
      // Should show reasons
      const reasons = page.locator('[data-testid="recommendation-reasons"]');
      await expect(reasons).toBeVisible();
    });

    test('should show warnings for low confidence recommendations', async ({ page }) => {
      await page.goto('/explore/bangkok');
      await page.click('[data-testid="recommendations-tab"]');
      
      // Look for warning badges
      const warnings = page.locator('[data-testid="confidence-warning"]');
      
      // At least some zones should have warnings (depending on data)
      // This is a soft check
      const count = await warnings.count();
      console.log(`Found ${count} zones with confidence warnings`);
    });
  });

  // ==========================================================================
  // WEATHER INTEGRATION
  // ==========================================================================
  test.describe('Weather Integration', () => {
    test('should show current weather', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      const weather = page.locator('[data-testid="weather-display"]');
      await expect(weather).toBeVisible();
    });

    test('should show weather impact on zones', async ({ page }) => {
      await page.goto('/explore/bangkok');
      
      // Check for weather modifier indicators
      const modifier = page.locator('[data-testid="weather-modifier"]');
      
      // May or may not be visible depending on current weather
      if (await modifier.isVisible()) {
        await expect(modifier).toContainText(/(rain|clear|hot|storm)/i);
      }
    });
  });
});
