/**
 * Integration test: User activity workflow
 * Tests: login -> create comment -> view activity feed -> export activity
 */

import { test, expect } from '@playwright/test';

const TEST_USER_EMAIL = 'test-operative@unmappedos.test';
const TEST_USER_PASSWORD = 'testpass123';

test.describe('Activity Tracking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display activity after creating comment', async ({ page }) => {
    // Login (assuming test user exists)
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/');

    // Navigate to a city/zone page
    await page.goto('/city/bangkok');

    // Create a comment
    await page.click('[data-testid="add-comment-btn"]');
    await page.fill('[data-testid="comment-input"]', 'Test intel comment');
    await page.click('[data-testid="submit-comment-btn"]');

    // Wait for success notification
    await expect(page.locator('text=INTEL LOGGED')).toBeVisible({ timeout: 5000 });

    // Check for karma notification
    await expect(page.locator('text=/KARMA \\+\\d+/')).toBeVisible({ timeout: 3000 });

    // Navigate to operative record
    await page.goto('/operative-record');

    // Verify activity appears in feed
    await expect(page.locator('text=Comment Create')).toBeVisible();
    await expect(page.locator('text=Bangkok')).toBeVisible();
  });

  test('should export activity as CSV', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');

    // Navigate to operative record
    await page.goto('/operative-record');

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("EXPORT CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('unmappedos-activity');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should show gamification stats', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');

    // Navigate to operative record
    await page.goto('/operative-record');

    // Check stats display
    await expect(page.locator('text=KARMA')).toBeVisible();
    await expect(page.locator('text=LEVEL')).toBeVisible();
    await expect(page.locator('text=STREAK')).toBeVisible();
    await expect(page.locator('text=TOTAL INTEL')).toBeVisible();
  });
});

test.describe('Authentication Protection', () => {
  test('should redirect to login when accessing protected page', async ({ page }) => {
    // Try to access operative record without auth
    await page.goto('/operative-record');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('reason=AUTH_REQUIRED');
  });

  test('should return 401 for API without auth', async ({ page, request }) => {
    const response = await request.get('/api/activity');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('AUTH_REQUIRED');
  });
});
