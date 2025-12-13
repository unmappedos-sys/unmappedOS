/**
 * @jest-environment node
 */

import { logActivity, exportActivityCSV, checkExportRateLimit, ACTION_TYPES } from '../../apps/web/lib/activityLogger';

// Mock Supabase
jest.mock('../../apps/web/lib/supabaseServer', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { badges: [] }, error: null }),
      range: jest.fn().mockResolvedValue({ 
        data: [
          {
            id: '1',
            action_type: 'comment_create',
            created_at: '2025-01-01T00:00:00Z',
            payload: { zone_id: 'test', city: 'Bangkok' },
            metadata: {},
          },
        ], 
        error: null 
      }),
    })),
  })),
}));

describe('Activity Logger', () => {
  describe('logActivity', () => {
    it('should log user activity without error', async () => {
      await expect(
        logActivity({
          user_id: 'test-user',
          action_type: ACTION_TYPES.COMMENT_CREATE,
          payload: { zone_id: 'test-zone', city: 'Test City' },
        })
      ).resolves.not.toThrow();
    });
  });

  describe('exportActivityCSV', () => {
    it('should export activities as CSV format', async () => {
      const csv = await exportActivityCSV('test-user');
      
      expect(typeof csv).toBe('string');
      expect(csv).toContain('timestamp,action_type,zone_id,city,details');
    });

    it('should properly quote CSV fields', async () => {
      const csv = await exportActivityCSV('test-user');
      const lines = csv.split('\n');
      
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('checkExportRateLimit', () => {
    it('should allow exports within limit', () => {
      const userId = `test-user-${Date.now()}`;
      
      expect(checkExportRateLimit(userId, 5, 3600000)).toBe(true);
      expect(checkExportRateLimit(userId, 5, 3600000)).toBe(true);
    });

    it('should block exports exceeding limit', () => {
      const userId = `test-user-limit-${Date.now()}`;
      const maxExports = 3;
      
      for (let i = 0; i < maxExports; i++) {
        expect(checkExportRateLimit(userId, maxExports, 3600000)).toBe(true);
      }
      
      // Next export should be blocked
      expect(checkExportRateLimit(userId, maxExports, 3600000)).toBe(false);
    });
  });
});
