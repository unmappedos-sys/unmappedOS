/**
 * Operative Mode Tests
 * 
 * Tests for auto mode switching and operative modes.
 */

import { 
  determineOperativeMode, 
  getModeConfig,
  type ModeConditions,
  type OperativeMode 
} from '@/lib/operativeMode';

describe('Operative Mode System', () => {
  describe('determineOperativeMode', () => {
    const baseConditions: ModeConditions = {
      batteryLevel: 80,
      isMoving: false,
      movementSpeed: 0,
      isNightTime: false,
      vitalityLevel: 80,
      isInsideZone: true,
      idleTimeMinutes: 0,
    };

    it('should return FAST_OPS for low battery', () => {
      const conditions: ModeConditions = {
        ...baseConditions,
        batteryLevel: 15,
      };

      expect(determineOperativeMode(conditions)).toBe('FAST_OPS');
    });

    it('should return DEEP_OPS when idle in zone for long time', () => {
      const conditions: ModeConditions = {
        ...baseConditions,
        isMoving: false,
        isInsideZone: true,
        idleTimeMinutes: 10, // 10 minutes idle
      };

      expect(determineOperativeMode(conditions)).toBe('DEEP_OPS');
    });

    it('should return SAFE_OPS during night with low vitality', () => {
      const conditions: ModeConditions = {
        ...baseConditions,
        isNightTime: true,
        vitalityLevel: 30,
      };

      expect(determineOperativeMode(conditions)).toBe('SAFE_OPS');
    });

    it('should return CRISIS for very low battery', () => {
      const conditions: ModeConditions = {
        ...baseConditions,
        batteryLevel: 3,
      };

      expect(determineOperativeMode(conditions)).toBe('CRISIS');
    });

    it('should return STANDARD for normal conditions', () => {
      expect(determineOperativeMode(baseConditions)).toBe('STANDARD');
    });
  });

  describe('getModeConfig', () => {
    it('should return correct config for FAST_OPS', () => {
      const config = getModeConfig('FAST_OPS');
      
      expect(config.hudDensity).toBe('minimal');
      expect(config.showWhispers).toBe(false);
    });

    it('should return correct config for DEEP_OPS', () => {
      const config = getModeConfig('DEEP_OPS');
      
      expect(config.hudDensity).toBe('full');
      expect(config.showWhispers).toBe(true);
      expect(config.showGhostBeacons).toBe(true);
    });

    it('should return correct config for CRISIS', () => {
      const config = getModeConfig('CRISIS');
      
      expect(config.hudDensity).toBe('minimal');
      expect(config.showPriceDeltas).toBe(false);
      expect(config.showSafeCorridors).toBe(true);
    });

    it('should return correct config for SAFE_OPS', () => {
      const config = getModeConfig('SAFE_OPS');
      
      expect(config.showSafeCorridors).toBe(true);
    });
  });
});
