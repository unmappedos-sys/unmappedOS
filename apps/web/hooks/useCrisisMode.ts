/**
 * useCrisisMode Hook
 * 
 * Manages crisis mode state, shake detection, and emergency protocols.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CrisisConfig,
  CrisisTrigger,
  getCrisisConfig,
  shouldActivateCrisis,
  createShakeDetector,
} from '@/lib/crisisMode';
import { createClient } from '@/lib/supabaseClient';

interface UseCrisisModeOptions {
  city: string;
  userId?: string;
  enableShakeDetection?: boolean;
  enableAutoActivation?: boolean;
  onActivate?: (trigger: CrisisTrigger) => void;
  onDeactivate?: () => void;
}

interface UseCrisisModeReturn {
  isActive: boolean;
  config: CrisisConfig;
  trigger: CrisisTrigger | null;
  activatedAt: Date | null;
  activate: (trigger: CrisisTrigger) => void;
  deactivate: () => void;
  callEmergency: (type: 'police' | 'ambulance' | 'embassy') => void;
}

export function useCrisisMode(options: UseCrisisModeOptions): UseCrisisModeReturn {
  const {
    city,
    userId,
    enableShakeDetection = true,
    enableAutoActivation = true,
    onActivate,
    onDeactivate,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [trigger, setTrigger] = useState<CrisisTrigger | null>(null);
  const [activatedAt, setActivatedAt] = useState<Date | null>(null);
  const [config, setConfig] = useState<CrisisConfig>(() => getCrisisConfig(city));

  const cleanupShakeRef = useRef<(() => void) | null>(null);
  const supabase = createClient();

  // Update config when city changes
  useEffect(() => {
    setConfig(getCrisisConfig(city));
  }, [city]);

  // Setup shake detection
  useEffect(() => {
    if (!enableShakeDetection || isActive) {
      return;
    }

    cleanupShakeRef.current = createShakeDetector(() => {
      activate('shake');
    });

    return () => {
      cleanupShakeRef.current?.();
    };
  }, [enableShakeDetection, isActive]);

  // Monitor for auto-activation conditions
  useEffect(() => {
    if (!enableAutoActivation || isActive) {
      return;
    }

    const checkConditions = async () => {
      // Get battery level
      let batteryLevel = 100;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch {
          // Battery API not available
        }
      }

      // For now, use placeholder vitality
      const vitalityLevel = 100;

      const result = shouldActivateCrisis({
        batteryLevel,
        vitalityLevel,
        hasRecentSOS: false,
      });

      if (result.activate && result.trigger) {
        activate(result.trigger);
      }
    };

    const interval = setInterval(checkConditions, 30000); // Check every 30s
    checkConditions(); // Initial check

    return () => clearInterval(interval);
  }, [enableAutoActivation, isActive]);

  const activate = useCallback(
    async (triggerType: CrisisTrigger) => {
      setIsActive(true);
      setTrigger(triggerType);
      setActivatedAt(new Date());

      // Log crisis event
      if (userId) {
        try {
          await supabase.from('crisis_events').insert({
            user_id: userId,
            trigger_type: triggerType,
            city,
            resolved: false,
          } as any);
        } catch (error) {
          console.error('[CRISIS] Failed to log event:', error);
        }
      }

      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      onActivate?.(triggerType);
    },
    [city, userId, supabase, onActivate]
  );

  const deactivate = useCallback(async () => {
    setIsActive(false);
    setTrigger(null);

    // Update crisis event as resolved
    if (userId && activatedAt) {
      try {
        await (supabase
          .from('crisis_events') as any)
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('resolved', false)
          .gte('created_at', activatedAt.toISOString());
      } catch (error) {
        console.error('[CRISIS] Failed to update event:', error);
      }
    }

    setActivatedAt(null);
    onDeactivate?.();
  }, [userId, activatedAt, supabase, onDeactivate]);

  const callEmergency = useCallback(
    (type: 'police' | 'ambulance' | 'embassy') => {
      let number: string;

      switch (type) {
        case 'police':
          number = config.emergency_police;
          break;
        case 'ambulance':
          number = config.emergency_ambulance;
          break;
        case 'embassy':
          number = config.embassy_phone;
          break;
      }

      // Attempt to initiate call
      if (number) {
        window.location.href = `tel:${number}`;
      }
    },
    [config]
  );

  return {
    isActive,
    config,
    trigger,
    activatedAt,
    activate,
    deactivate,
    callEmergency,
  };
}
