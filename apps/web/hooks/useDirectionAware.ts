import { useEffect, useState, useCallback } from 'react';

export interface DirectionData {
  heading: number | null; // Device compass heading in degrees (0-360)
  targetBearing: number | null; // Bearing to target
  relativeBearing: number | null; // Relative angle (-180 to 180)
  distance: number | null; // Distance to target in meters
  supported: boolean;
}

interface UseDirectionAwareOptions {
  targetLat?: number;
  targetLon?: number;
  userLat?: number;
  userLon?: number;
}

/**
 * Direction-Aware Mode Hook
 * Uses DeviceOrientation API to provide compass heading and bearing to target
 * Falls back gracefully when API unavailable
 */
export function useDirectionAware({
  targetLat,
  targetLon,
  userLat,
  userLon,
}: UseDirectionAwareOptions = {}): DirectionData {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if DeviceOrientationEvent is supported
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }

    setSupported(true);
    let cleanupFn: (() => void) | undefined;
    let isMounted = true;

    // Request permission on iOS 13+
    const requestPermission = async () => {
      if (
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const permission = await (
            DeviceOrientationEvent as any
          ).requestPermission();
          if (permission !== 'granted') {
            if (isMounted) setSupported(false);
            return;
          }
        } catch (error) {
          console.warn('Device orientation permission denied', error);
          if (isMounted) setSupported(false);
          return;
        }
      }

      // Add orientation listener
      const handleOrientation = (event: DeviceOrientationEvent) => {
        if (!isMounted) return;
        if (event.alpha !== null) {
          // alpha is compass heading (0-360)
          // Adjust for iOS which reports differently
          let compassHeading = event.alpha;
          
          // On iOS, webkitCompassHeading is more reliable
          if ((event as any).webkitCompassHeading !== undefined) {
            compassHeading = (event as any).webkitCompassHeading;
          }

          setHeading(compassHeading);
        }
      };

      window.addEventListener('deviceorientation', handleOrientation, true);

      cleanupFn = () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    };

    requestPermission();

    return () => {
      isMounted = false;
      cleanupFn?.();
    };
  }, []);

  // Calculate bearing to target
  const calculateBearing = useCallback((): number | null => {
    if (
      targetLat === undefined ||
      targetLon === undefined ||
      userLat === undefined ||
      userLon === undefined
    ) {
      return null;
    }

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const dLon = toRad(targetLon - userLon);
    const lat1 = toRad(userLat);
    const lat2 = toRad(targetLat);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360
  }, [targetLat, targetLon, userLat, userLon]);

  // Calculate distance to target (Haversine formula)
  const calculateDistance = useCallback((): number | null => {
    if (
      targetLat === undefined ||
      targetLon === undefined ||
      userLat === undefined ||
      userLon === undefined
    ) {
      return null;
    }

    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(userLat);
    const φ2 = toRad(targetLat);
    const Δφ = toRad(targetLat - userLat);
    const Δλ = toRad(targetLon - userLon);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, [targetLat, targetLon, userLat, userLon]);

  const targetBearing = calculateBearing();
  const distance = calculateDistance();

  // Calculate relative bearing (for arrow rotation)
  const relativeBearing =
    heading !== null && targetBearing !== null
      ? ((targetBearing - heading + 540) % 360) - 180
      : null;

  return {
    heading,
    targetBearing,
    relativeBearing,
    distance,
    supported,
  };
}
