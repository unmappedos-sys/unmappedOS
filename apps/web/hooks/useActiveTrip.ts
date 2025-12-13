/**
 * useActiveTrip Hook - Manage active trip state and check-in timer
 * Implements 45-minute check-in reminder for exported trips
 */

import { useState, useEffect, useCallback } from 'react';

export type TripState = {
  isActive: boolean;
  startTime: number | null;
  checkInDue: number | null;
  city: string | null;
  zoneName: string | null;
  anchorCoords: [number, number] | null;
};

const TRIP_STORAGE_KEY = 'unmapped_active_trip';
const CHECK_IN_DURATION = 45 * 60 * 1000; // 45 minutes

export function useActiveTrip() {
  const [trip, setTrip] = useState<TripState>({
    isActive: false,
    startTime: null,
    checkInDue: null,
    city: null,
    zoneName: null,
    anchorCoords: null,
  });

  // Load trip from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(TRIP_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TripState;
        setTrip(parsed);
      } catch (e) {
        console.warn('[ActiveTrip] Failed to parse stored trip:', e);
        localStorage.removeItem(TRIP_STORAGE_KEY);
      }
    }
  }, []);

  // Persist trip to localStorage
  const persistTrip = useCallback((newTrip: TripState) => {
    setTrip(newTrip);
    if (typeof window !== 'undefined') {
      if (newTrip.isActive) {
        localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(newTrip));
      } else {
        localStorage.removeItem(TRIP_STORAGE_KEY);
      }
    }
  }, []);

  // Start a new trip
  const startTrip = useCallback(
    (city: string, zoneName: string, anchorCoords: [number, number]) => {
      const now = Date.now();
      const newTrip: TripState = {
        isActive: true,
        startTime: now,
        checkInDue: now + CHECK_IN_DURATION,
        city,
        zoneName,
        anchorCoords,
      };
      persistTrip(newTrip);

      // Request notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission();
      }
    },
    [persistTrip]
  );

  // End trip
  const endTrip = useCallback(() => {
    persistTrip({
      isActive: false,
      startTime: null,
      checkInDue: null,
      city: null,
      zoneName: null,
      anchorCoords: null,
    });
  }, [persistTrip]);

  // Check if check-in is due
  const isCheckInDue = useCallback(() => {
    if (!trip.isActive || !trip.checkInDue) return false;
    return Date.now() >= trip.checkInDue;
  }, [trip]);

  // Show check-in notification
  const showCheckInNotification = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('UNMAPPED OS // CHECK-IN REQUIRED', {
        body: `45 minutes elapsed since ${trip.zoneName} export. Confirm status or report hazard.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'checkin',
        requireInteraction: true,
      });
    }
  }, [trip.zoneName]);

  // Check-in timer effect
  useEffect(() => {
    if (!trip.isActive || !trip.checkInDue) return;

    const checkInterval = setInterval(() => {
      if (isCheckInDue()) {
        showCheckInNotification();
        clearInterval(checkInterval);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [trip, isCheckInDue, showCheckInNotification]);

  // Get time until check-in
  const timeUntilCheckIn = useCallback(() => {
    if (!trip.checkInDue) return null;
    const remaining = trip.checkInDue - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [trip.checkInDue]);

  return {
    trip,
    startTrip,
    endTrip,
    isCheckInDue: isCheckInDue(),
    timeUntilCheckIn: timeUntilCheckIn(),
  };
}
