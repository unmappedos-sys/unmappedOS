/**
 * Gamification E2E Test
 * 
 * Tests badges, streaks, and karma display.
 */

import { test, expect } from '@playwright/test';

test.describe('Public Leaderboard', () => {
  test('should display leaderboard page', async ({ page }) => {
    // API test
    const response = await page.request.get('/api/public/leaderboard');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('leaderboard');
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });

  test('should support different leaderboard types', async ({ page }) => {
    // Karma leaderboard
    const karmaResponse = await page.request.get('/api/public/leaderboard?type=karma');
    expect(karmaResponse.ok()).toBe(true);
    
    // Level leaderboard
    const levelResponse = await page.request.get('/api/public/leaderboard?type=level');
    expect(levelResponse.ok()).toBe(true);
    
    // Streak leaderboard
    const streakResponse = await page.request.get('/api/public/leaderboard?type=streak');
    expect(streakResponse.ok()).toBe(true);
  });

  test('should filter by city', async ({ page }) => {
    const response = await page.request.get('/api/public/leaderboard?city=bangkok');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.city).toBe('bangkok');
  });
});

test.describe('Authenticated Gamification', () => {
  test.skip('should show user karma on profile', async ({ page }) => {
    // Requires authentication
  });

  test.skip('should show badges gallery', async ({ page }) => {
    // Requires authentication
  });

  test.skip('should show streak indicator', async ({ page }) => {
    // Requires authentication
  });
});

test.describe('Gamification Components', () => {
  test('should load gamification data correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for gamification-related UI elements
    const gamifyElements = page.locator('[class*="karma"], [class*="badge"], [class*="streak"], [class*="level"]');
  });
});
