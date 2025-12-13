/**
 * @jest-environment node
 */

import { awardKarma, getKarmaForAction, getLevelProgress } from '../../apps/web/lib/gamify';
import { ACTION_TYPES } from '../../apps/web/lib/activityLogger';

// Mock Supabase
jest.mock('../../apps/web/lib/supabaseServer', () => ({
  createServiceClient: jest.fn(() => ({
    rpc: jest.fn().mockResolvedValue({ error: null }),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

describe('Gamification Engine', () => {
  describe('getKarmaForAction', () => {
    it('should return correct karma for comment creation', () => {
      const karma = getKarmaForAction(ACTION_TYPES.COMMENT_CREATE);
      expect(karma).toBe(10);
    });

    it('should return correct karma for price report', () => {
      const karma = getKarmaForAction(ACTION_TYPES.PRICE_REPORT);
      expect(karma).toBe(5);
    });

    it('should return 0 for unknown action', () => {
      const karma = getKarmaForAction('unknown_action');
      expect(karma).toBe(0);
    });
  });

  describe('awardKarma', () => {
    it('should call database function to award karma', async () => {
      await expect(
        awardKarma('test-user-id', 10, 'Test reason')
      ).resolves.not.toThrow();
    });

    it('should handle quest ID parameter', async () => {
      await expect(
        awardKarma('test-user-id', 50, 'Quest completed', 'first_pack')
      ).resolves.not.toThrow();
    });
  });

  describe('getLevelProgress', () => {
    it('should calculate progress to next level correctly', () => {
      const progress = getLevelProgress(250, 2);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('should return 0 at exact level threshold', () => {
      const progress = getLevelProgress(100, 2);
      expect(progress).toBe(0);
    });

    it('should not exceed 100%', () => {
      const progress = getLevelProgress(1000, 2);
      expect(progress).toBe(100);
    });
  });
});
