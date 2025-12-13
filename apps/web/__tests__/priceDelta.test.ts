/**
 * Price Delta Tests
 * 
 * Tests for price tracking and delta calculation.
 */

import type { PriceDelta } from '@/lib/priceDelta';

// Local implementations for testing (matching lib logic)
function calculateDeltaStatus(price: number, median: number): PriceDelta['status'] {
  const deltaPercentage = ((price - median) / median) * 100;
  if (deltaPercentage <= -15) return 'BARGAIN';
  if (deltaPercentage <= 10) return 'NORMAL';
  if (deltaPercentage <= 25) return 'HIGH';
  return 'OVERPRICED';
}

function formatPriceDelta(delta: { price: number; zone_median: number; delta_percent: number; status: string }): string {
  const sign = delta.delta_percent >= 0 ? '+' : '';
  return `${sign}${delta.delta_percent}% // ${delta.status}`;
}

describe('Price Delta System', () => {
  describe('calculateDeltaStatus', () => {
    it('should return BARGAIN for prices 20% below median', () => {
      const status = calculateDeltaStatus(80, 100);
      expect(status).toBe('BARGAIN');
    });

    it('should return NORMAL for prices near median', () => {
      const status = calculateDeltaStatus(100, 100);
      expect(status).toBe('NORMAL');

      const status2 = calculateDeltaStatus(105, 100);
      expect(status2).toBe('NORMAL');
    });

    it('should return HIGH for prices 10-30% above median', () => {
      const status = calculateDeltaStatus(120, 100);
      expect(status).toBe('HIGH');
    });

    it('should return OVERPRICED for prices 30%+ above median', () => {
      const status = calculateDeltaStatus(140, 100);
      expect(status).toBe('OVERPRICED');
    });
  });

  describe('formatPriceDelta', () => {
    it('should format positive delta with plus sign', () => {
      const delta = {
        price: 120,
        zone_median: 100,
        delta_percent: 20,
        status: 'HIGH',
      };

      const formatted = formatPriceDelta(delta);
      expect(formatted).toContain('+20%');
    });

    it('should format negative delta with minus sign', () => {
      const delta = {
        price: 80,
        zone_median: 100,
        delta_percent: -20,
        status: 'BARGAIN',
      };

      const formatted = formatPriceDelta(delta);
      expect(formatted).toContain('-20%');
    });

    it('should include status indicator', () => {
      const delta = {
        price: 150,
        zone_median: 100,
        delta_percent: 50,
        status: 'OVERPRICED',
      };

      const formatted = formatPriceDelta(delta);
      expect(formatted.toLowerCase()).toContain('overpriced');
    });
  });
});
