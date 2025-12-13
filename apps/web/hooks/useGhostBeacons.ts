/**
 * useGhostBeacons Hook
 * 
 * Manages ephemeral beacon discovery based on proximity.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GhostBeacon,
  GhostBeaconType,
  BeaconTriggerEvent,
  generateGhostBeacons,
  checkBeaconProximity,
  triggerBeacon,
  decayBeacon,
  cleanupExpiredBeacons,
} from '../lib/ghostBeacon';

// Re-export ProximityAlert type that matches BeaconTriggerEvent
export type ProximityAlert = BeaconTriggerEvent;

interface UseGhostBeaconsOptions {
  zoneId: string;
  userLocation: { lat: number; lng: number } | null;
  proximityRadius?: number; // meters
  checkInterval?: number; // ms
  enableHaptics?: boolean;
  // Zone data for beacon generation
  zoneData?: {
    centroid: { lat: number; lon: number };
    anchors: Array<{ lat: number; lon: number; tags: Record<string, string> }>;
    pois: Array<{ lat: number; lon: number; tags: Record<string, string> }>;
  };
}

interface UseGhostBeaconsReturn {
  activeBeacons: GhostBeacon[];
  triggeredBeacons: GhostBeacon[];
  proximityAlerts: ProximityAlert[];
  generateNewBeacons: () => Promise<void>;
  isGenerating: boolean;
}

export function useGhostBeacons(
  options: UseGhostBeaconsOptions
): UseGhostBeaconsReturn {
  const {
    zoneId,
    userLocation,
    proximityRadius = 50,
    checkInterval = 5000,
    enableHaptics = true,
    zoneData,
  } = options;

  const [activeBeacons, setActiveBeacons] = useState<GhostBeacon[]>([]);
  const [triggeredBeacons, setTriggeredBeacons] = useState<GhostBeacon[]>([]);
  const [proximityAlerts, setProximityAlerts] = useState<ProximityAlert[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const lastProximityCheck = useRef<number>(Date.now());

  // Generate beacons for zone
  const generateNewBeacons = useCallback(async () => {
    if (!zoneData) {
      console.warn('[GHOST BEACONS] No zone data provided for beacon generation');
      return;
    }

    setIsGenerating(true);

    try {
      const newBeacons = generateGhostBeacons({
        zone_id: zoneId,
        centroid: zoneData.centroid,
        anchors: zoneData.anchors,
        pois: zoneData.pois,
      });

      setActiveBeacons((prev) => {
        // Merge with existing, avoid duplicates
        const existingIds = new Set(prev.map((b) => b.id));
        const filtered = newBeacons.filter((b) => !existingIds.has(b.id));
        return [...prev, ...filtered];
      });

      console.log(
        `[GHOST BEACONS] Generated ${newBeacons.length} beacons for zone ${zoneId}`
      );
    } catch (error) {
      console.error('[GHOST BEACONS] Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [zoneId, zoneData]);

  // Check proximity to beacons
  const checkProximity = useCallback(() => {
    if (!userLocation || activeBeacons.length === 0) return;

    const now = Date.now();
    if (now - lastProximityCheck.current < checkInterval) return;

    lastProximityCheck.current = now;

    const newlyTriggered: GhostBeacon[] = [];

    // Check proximity using the library function
    const userLoc = { lat: userLocation.lat, lon: userLocation.lng };
    const alert = checkBeaconProximity(userLoc, activeBeacons);

    if (alert) {
      setProximityAlerts([alert]);

      // Check if beacon should trigger
      if (!alert.beacon.triggered) {
        const triggered = triggerBeacon(alert.beacon);
        newlyTriggered.push(triggered);

        // Optional: Haptic feedback
        if (enableHaptics && 'vibrate' in navigator) {
          navigator.vibrate(alert.haptic_pattern);
        }

        console.log(`[GHOST BEACON] Triggered: ${alert.beacon.beacon_type} at ${alert.distance.toFixed(0)}m`);
      }
    } else {
      setProximityAlerts([]);
    }

    // Update triggered beacons
    if (newlyTriggered.length > 0) {
      setActiveBeacons((prev) =>
        prev.map((b) => {
          const triggered = newlyTriggered.find((t) => t.id === b.id);
          return triggered || b;
        })
      );

      setTriggeredBeacons((prev) => [...prev, ...newlyTriggered]);
    }
  }, [userLocation, activeBeacons, checkInterval, enableHaptics]);

  // Cleanup expired beacons
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBeacons((prev) => {
        const cleaned = cleanupExpiredBeacons(prev);
        if (cleaned.length !== prev.length) {
          console.log(
            `[GHOST BEACONS] Cleaned up ${prev.length - cleaned.length} expired beacons`
          );
        }
        return cleaned;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Proximity checking loop
  useEffect(() => {
    if (!userLocation) return;

    checkProximity();
    const interval = setInterval(checkProximity, checkInterval);

    return () => clearInterval(interval);
  }, [userLocation, checkProximity, checkInterval]);

  // Generate initial beacons
  useEffect(() => {
    if (zoneId && zoneData && activeBeacons.length === 0) {
      generateNewBeacons();
    }
  }, [zoneId, zoneData, activeBeacons.length, generateNewBeacons]);

  return {
    activeBeacons,
    triggeredBeacons,
    proximityAlerts,
    generateNewBeacons,
    isGenerating,
  };
}

function getHapticPattern(beaconType: GhostBeaconType): number[] {
  switch (beaconType) {
    case 'local_gem':
      return [100, 50, 100];
    case 'historic':
      return [200, 100, 200];
    case 'viewpoint':
      return [50, 30, 50, 30, 50];
    case 'transit_hub':
      return [150];
    case 'mystery':
      return [100, 100, 100, 100, 100];
    default:
      return [100];
  }
}
