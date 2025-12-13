/**
 * useOperativeMode Hook
 * 
 * Manages automatic mode switching based on device conditions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OperativeMode,
  ModeConditions,
  ModeConfig,
  determineOperativeMode,
  getModeConfig,
  isNightTime,
  calculateMovementSpeed,
} from '@/lib/operativeMode';

interface UseOperativeModeOptions {
  initialMode?: OperativeMode;
  autoSwitch?: boolean;
  onModeChange?: (newMode: OperativeMode, oldMode: OperativeMode) => void;
}

interface UseOperativeModeReturn {
  mode: OperativeMode;
  config: ModeConfig;
  conditions: ModeConditions;
  setManualMode: (mode: OperativeMode | null) => void;
  updateVitality: (level: number) => void;
  updateZoneStatus: (isInside: boolean) => void;
}

export function useOperativeMode(
  options: UseOperativeModeOptions = {}
): UseOperativeModeReturn {
  const { initialMode = 'STANDARD', autoSwitch = true, onModeChange } = options;

  const [mode, setMode] = useState<OperativeMode>(initialMode);
  const [manualOverride, setManualOverride] = useState<OperativeMode | null>(null);
  const [conditions, setConditions] = useState<ModeConditions>({
    batteryLevel: 100,
    isMoving: false,
    movementSpeed: 0,
    isNightTime: isNightTime(),
    vitalityLevel: 100,
    isInsideZone: false,
    idleTimeMinutes: 0,
  });

  const positionHistory = useRef<Array<{ lat: number; lon: number; timestamp: number }>>([]);
  const lastMovementTime = useRef<number>(Date.now());
  const previousMode = useRef<OperativeMode>(initialMode);

  // Monitor battery level
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
      return;
    }

    let battery: any = null;
    let isMounted = true;

    const updateBattery = () => {
      if (battery && isMounted) {
        setConditions((prev) => ({
          ...prev,
          batteryLevel: Math.round(battery.level * 100),
        }));
      }
    };

    (navigator as any).getBattery().then((b: any) => {
      if (!isMounted) return;
      battery = b;
      updateBattery();

      battery.addEventListener('levelchange', updateBattery);
    });

    return () => {
      isMounted = false;
      if (battery) {
        battery.removeEventListener('levelchange', updateBattery);
      }
    };
  }, []);

  // Monitor time of day
  useEffect(() => {
    const checkTime = () => {
      setConditions((prev) => ({
        ...prev,
        isNightTime: isNightTime(),
      }));
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Monitor movement via geolocation (if available)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const timestamp = Date.now();

        positionHistory.current.push({ lat: latitude, lon: longitude, timestamp });

        // Keep only last 10 positions
        if (positionHistory.current.length > 10) {
          positionHistory.current.shift();
        }

        const speed = calculateMovementSpeed(positionHistory.current);
        const isMoving = speed > 0.5; // Moving if > 0.5 km/h

        if (isMoving) {
          lastMovementTime.current = timestamp;
        }

        const idleTimeMinutes = (timestamp - lastMovementTime.current) / (1000 * 60);

        setConditions((prev) => ({
          ...prev,
          isMoving,
          movementSpeed: speed,
          idleTimeMinutes,
        }));
      },
      (error) => {
        console.warn('[useOperativeMode] Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: false, // Save battery
        maximumAge: 10000,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Auto-determine mode when conditions change
  useEffect(() => {
    if (!autoSwitch) return;

    const newMode = determineOperativeMode({
      ...conditions,
      manualOverride: manualOverride || undefined,
    });

    if (newMode !== mode) {
      previousMode.current = mode;
      setMode(newMode);
      onModeChange?.(newMode, previousMode.current);
    }
  }, [conditions, manualOverride, autoSwitch, mode, onModeChange]);

  const setManualMode = useCallback((newMode: OperativeMode | null) => {
    setManualOverride(newMode);
    if (newMode) {
      previousMode.current = mode;
      setMode(newMode);
      onModeChange?.(newMode, previousMode.current);
    }
  }, [mode, onModeChange]);

  const updateVitality = useCallback((level: number) => {
    setConditions((prev) => ({
      ...prev,
      vitalityLevel: Math.max(0, Math.min(100, level)),
    }));
  }, []);

  const updateZoneStatus = useCallback((isInside: boolean) => {
    setConditions((prev) => ({
      ...prev,
      isInsideZone: isInside,
    }));
  }, []);

  return {
    mode,
    config: getModeConfig(mode),
    conditions,
    setManualMode,
    updateVitality,
    updateZoneStatus,
  };
}
