import { useCallback, useEffect, useState } from 'react';
import { OpsMode } from '@/components/hud/types';

interface UseOpsModeOptions {
  forceMode?: OpsMode;
  transitionDuration?: number;
}

interface OpsModeState {
  mode: OpsMode;
  isTransitioning: boolean;
  setMode: (mode: OpsMode) => void;
  toggleMode: () => void;
}

/**
 * useOpsMode: Hook for managing Day/Night/Offline operational modes
 *
 * Features:
 * - Auto-detection via ambient light sensor (if available)
 * - Manual override capability
 * - Glitch transition effect on mode change
 * - Offline mode triggered by connection status
 */
export function useOpsMode(options: UseOpsModeOptions = {}): OpsModeState {
  const { forceMode, transitionDuration = 300 } = options;

  const [mode, setModeState] = useState<OpsMode>('NIGHT');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-detect based on time or ambient light
  useEffect(() => {
    if (forceMode) {
      setModeState(forceMode);
      return;
    }

    const detectMode = () => {
      const hour = new Date().getHours();
      // Day mode between 6am and 6pm
      return hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT';
    };

    // Initial detection
    setModeState(detectMode());

    // Try ambient light sensor if available
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-expect-error - AmbientLightSensor not in TS types
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          // High lux = bright environment = day mode
          const illuminance = sensor.illuminance;
          if (illuminance > 1000) {
            setModeState('DAY');
          } else if (illuminance < 50) {
            setModeState('NIGHT');
          }
        });
        sensor.start();
        return () => sensor.stop();
      } catch {
        // Sensor not available, fall back to time-based
      }
    }

    // Update on hour change
    const interval = setInterval(() => {
      setModeState(detectMode());
    }, 60000);

    return () => clearInterval(interval);
  }, [forceMode]);

  // Handle connection status for offline mode
  useEffect(() => {
    const handleOnline = () => {
      if (mode === 'OFFLINE') {
        const hour = new Date().getHours();
        setModeState(hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT');
      }
    };

    const handleOffline = () => {
      setModeState('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setModeState('OFFLINE');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mode]);

  // Set mode with transition effect
  const setMode = useCallback(
    (newMode: OpsMode) => {
      if (newMode === mode) return;

      setIsTransitioning(true);

      // Apply glitch effect to body
      document.body.classList.add('day-ops-transition');

      setTimeout(() => {
        setModeState(newMode);

        // Update body class for theme
        document.body.classList.remove('night-ops', 'day-ops', 'offline-ops');
        document.body.classList.add(`${newMode.toLowerCase()}-ops`);

        setTimeout(() => {
          setIsTransitioning(false);
          document.body.classList.remove('day-ops-transition');
        }, transitionDuration);
      }, transitionDuration / 2);
    },
    [mode, transitionDuration]
  );

  // Toggle between day/night
  const toggleMode = useCallback(() => {
    if (mode === 'OFFLINE') return; // Can't toggle out of offline
    setMode(mode === 'DAY' ? 'NIGHT' : 'DAY');
  }, [mode, setMode]);

  return {
    mode,
    isTransitioning,
    setMode,
    toggleMode,
  };
}

/**
 * useHaptics: Hook for managing haptic feedback
 */
export function useHaptics() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('vibrate' in navigator);
  }, []);

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!supported) return;
      navigator.vibrate(pattern);
    },
    [supported]
  );

  const patterns = {
    tap: () => vibrate(10),
    confirm: () => vibrate([30, 50, 30]),
    error: () => vibrate([100, 50, 100, 50, 100]),
    warning: () => vibrate([50, 30, 50]),
    success: () => vibrate([20, 40, 80]),
    download: () => vibrate([10, 20, 10, 20, 10, 20, 100]),
  };

  return {
    supported,
    vibrate,
    ...patterns,
  };
}

/**
 * useGyroscope: Hook for gyroscope-based parallax effects
 */
export function useGyroscope() {
  const [orientation, setOrientation] = useState({ x: 0, y: 0, z: 0 });
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) {
      setSupported(false);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setSupported(true);
      setOrientation({
        x: event.gamma ? Math.max(-30, Math.min(30, event.gamma)) / 30 : 0,
        y: event.beta ? Math.max(-30, Math.min(30, event.beta - 45)) / 30 : 0,
        z: event.alpha ? event.alpha / 360 : 0,
      });
    };

    // Request permission on iOS 13+
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => setSupported(false));
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return { orientation, supported };
}

/**
 * useScrollProgress: Hook for tracking scroll position
 */
export function useScrollProgress(threshold: number = 0) {
  const [progress, setProgress] = useState(0);
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      setProgress(maxScroll > 0 ? scrollY / maxScroll : 0);
      setIsPastThreshold(scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { progress, isPastThreshold };
}
