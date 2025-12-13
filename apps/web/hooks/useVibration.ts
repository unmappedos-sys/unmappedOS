/**
 * useVibration Hook - Haptic feedback patterns for field operations
 * Implements tactile patterns for zone entry, anchor lock, and hazard reporting
 */

import { useCallback } from 'react';

export type VibrationPattern = 'zone_entry' | 'anchor_lock' | 'hazard_report' | 'button_press';

const PATTERNS: Record<VibrationPattern, number[]> = {
  zone_entry: [200, 100, 200], // Double heartbeat
  anchor_lock: [500], // Single strong pulse
  hazard_report: [80, 60, 80, 60, 80], // Triple short burst
  button_press: [50], // Light tap
};

export function useVibration() {
  const vibrate = useCallback((pattern: VibrationPattern) => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) {
      // Fallback: visual feedback only
      return false;
    }

    try {
      navigator.vibrate(PATTERNS[pattern]);
      return true;
    } catch (error) {
      console.warn('[Vibration] Failed to vibrate:', error);
      return false;
    }
  }, []);

  const isSupported = useCallback(() => {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }, []);

  return {
    vibrate,
    isSupported: isSupported(),
  };
}
