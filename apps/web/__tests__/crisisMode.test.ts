/**
 * Crisis Mode Tests
 * 
 * Tests for crisis mode functionality and safe phrases.
 */

import {
  getSafePhrase,
  detectShakeGesture,
  validateSafePhrase,
  type CrisisConfig,
} from '@/lib/crisisMode';

describe('Crisis Mode', () => {
  describe('getSafePhrase', () => {
    it('should return a safe phrase for Bangkok', () => {
      const phrase = getSafePhrase('bangkok');
      expect(phrase).toBeTruthy();
      expect(typeof phrase).toBe('string');
    });

    it('should return a safe phrase for Tokyo', () => {
      const phrase = getSafePhrase('tokyo');
      expect(phrase).toBeTruthy();
      expect(typeof phrase).toBe('string');
    });

    it('should return generic phrase for unknown city', () => {
      const phrase = getSafePhrase('unknown_city');
      expect(phrase).toBeTruthy();
    });
  });

  describe('detectShakeGesture', () => {
    it('should detect shake with high acceleration', () => {
      const events = [
        { x: 15, y: 0, z: 0, timestamp: 0 },
        { x: -15, y: 0, z: 0, timestamp: 100 },
        { x: 15, y: 0, z: 0, timestamp: 200 },
      ];

      expect(detectShakeGesture(events)).toBe(true);
    });

    it('should not detect shake with low acceleration', () => {
      const events = [
        { x: 1, y: 0, z: 0, timestamp: 0 },
        { x: 2, y: 0, z: 0, timestamp: 100 },
        { x: 1, y: 0, z: 0, timestamp: 200 },
      ];

      expect(detectShakeGesture(events)).toBe(false);
    });

    it('should not detect shake with too few events', () => {
      const events = [
        { x: 20, y: 0, z: 0, timestamp: 0 },
      ];

      expect(detectShakeGesture(events)).toBe(false);
    });
  });

  describe('validateSafePhrase', () => {
    it('should validate known safe phrases', () => {
      // Bangkok safe phrases
      expect(validateSafePhrase('bangkok', 'ไม่เป็นไร')).toBe(true);
      expect(validateSafePhrase('bangkok', 'ขอโทษครับ')).toBe(true);
    });

    it('should reject invalid phrases', () => {
      expect(validateSafePhrase('bangkok', 'random phrase')).toBe(false);
    });
  });
});
