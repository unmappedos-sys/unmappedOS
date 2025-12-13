/**
 * Texture System Tests
 * 
 * Tests for dynamic texture adaptation.
 */

import {
  TextureType,
  calculateTextureShift,
  getTextureUIConfig,
  shouldAlertTextureShift,
  calculateVitality,
} from '@/lib/textureSystem';

describe('Texture System', () => {
  describe('calculateTextureShift', () => {
    it('should maintain base texture during midday with low reports', () => {
      const result = calculateTextureShift('ANALOG', {
        hour: 14,
        dayOfWeek: 3, // Wednesday
        recentReports: 0,
      });

      expect(result.current_texture).toBe('ANALOG');
      expect(result.shift_magnitude).toBe(0);
    });

    it('should shift SILENCE to ANALOG at night', () => {
      const result = calculateTextureShift('SILENCE', {
        hour: 22,
        dayOfWeek: 5, // Friday
        recentReports: 0,
      });

      expect(['ANALOG', 'SILENCE']).toContain(result.current_texture);
      expect(result.time_modifier).toBeLessThan(0);
    });

    it('should shift to CHAOS with high recent reports', () => {
      const result = calculateTextureShift('NEON', {
        hour: 14,
        dayOfWeek: 6, // Saturday
        recentReports: 15,
      });

      expect(['CHAOS', 'NEON']).toContain(result.current_texture);
      expect(result.incident_modifier).toBeGreaterThan(0);
    });

    it('should boost NEON on weekend nights', () => {
      const result = calculateTextureShift('ANALOG', {
        hour: 23,
        dayOfWeek: 6, // Saturday
        recentReports: 0,
      });

      expect(result.time_modifier).toBeLessThan(0);
      expect(result.day_modifier).toBeGreaterThan(0);
    });
  });

  describe('calculateVitality', () => {
    it('should return high vitality for SILENCE in morning', () => {
      const vitality = calculateVitality('SILENCE', {
        hour: 8,
        recentReports: 0,
        crowdDensity: 0.2,
      });

      expect(vitality).toBeGreaterThan(7);
    });

    it('should return low vitality for CHAOS with reports', () => {
      const vitality = calculateVitality('CHAOS', {
        hour: 2,
        recentReports: 10,
        crowdDensity: 0.9,
      });

      expect(vitality).toBeLessThan(4);
    });

    it('should clamp vitality between 0 and 10', () => {
      const vitality = calculateVitality('CHAOS', {
        hour: 3,
        recentReports: 50,
        crowdDensity: 1.5,
      });

      expect(vitality).toBeGreaterThanOrEqual(0);
      expect(vitality).toBeLessThanOrEqual(10);
    });
  });

  describe('getTextureUIConfig', () => {
    it('should return correct config for SILENCE', () => {
      const config = getTextureUIConfig('SILENCE');

      expect(config.color).toBe('#8b5cf6');
      expect(config.icon).toBe('🌙');
      expect(config.description).toContain('meditation');
    });

    it('should return correct config for CHAOS', () => {
      const config = getTextureUIConfig('CHAOS');

      expect(config.color).toBe('#ef4444');
      expect(config.icon).toBe('⚡');
      expect(config.description).toContain('Unpredictable');
    });
  });

  describe('shouldAlertTextureShift', () => {
    it('should alert on SILENCE to CHAOS shift', () => {
      const alert = shouldAlertTextureShift('SILENCE', 'CHAOS');

      expect(alert.alert).toBe(true);
      expect(alert.severity).toBe('high');
      expect(alert.message).toContain('EXTREME');
    });

    it('should not alert on adjacent shifts', () => {
      const alert = shouldAlertTextureShift('ANALOG', 'NEON');

      expect(alert.alert).toBe(false);
    });

    it('should alert on CHAOS to SILENCE shift', () => {
      const alert = shouldAlertTextureShift('CHAOS', 'SILENCE');

      expect(alert.alert).toBe(true);
      expect(alert.message).toContain('calming');
    });
  });
});
