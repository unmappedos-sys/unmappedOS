/**
 * Login Flow E2E Test
 * 
 * Tests the complete authentication flow.
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with operative theme', async ({ page }) => {
    // Check for operative-style branding
    await expect(page.locator('text=UNMAPPED')).toBeVisible();
    
    // Check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Check for password input
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show authentication error
    await expect(page.locator('text=/error|invalid|failed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should have link to signup page', async ({ page }) => {
    await expect(page.locator('a[href="/signup"], text=/sign up|register|create account/i')).toBeVisible();
  });

  test('should navigate to signup when clicking signup link', async ({ page }) => {
    await page.click('a[href="/signup"], text=/sign up|register/i');
    await expect(page).toHaveURL(/signup/);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/operative-record');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect from profile when not logged in', async ({ page }) => {
    await page.goto('/profile');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
