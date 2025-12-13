/**
 * useSnapshotGPS Hook - Privacy-focused GPS with snapshot-only tracking
 * Implements one-time geolocation on user action, no continuous tracking
 */

import { useState, useCallback } from 'react';

export type GPSPosition = {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
};

export type GPSError = {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';
  message: string;
};

export type GPSState = {
  position: GPSPosition | null;
  error: GPSError | null;
  loading: boolean;
  lastSnapshot: number | null;
};

// Simulated GPS for development
let simulatedPosition: GPSPosition | null = null;

export function setSimulatedGPS(lat: number, lon: number) {
  simulatedPosition = {
    lat,
    lon,
    accuracy: 10,
    timestamp: Date.now(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('dev_gps', JSON.stringify(simulatedPosition));
  }
}

export function clearSimulatedGPS() {
  simulatedPosition = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_gps');
  }
}

export function useSnapshotGPS() {
  const [state, setState] = useState<GPSState>({
    position: null,
    error: null,
    loading: false,
    lastSnapshot: null,
  });

  const requestSnapshot = useCallback(async (): Promise<GPSPosition | null> => {
    // Check for simulated GPS (dev mode)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dev_gps');
      if (stored) {
        try {
          const simulated = JSON.parse(stored) as GPSPosition;
          setState({
            position: simulated,
            error: null,
            loading: false,
            lastSnapshot: Date.now(),
          });
          return simulated;
        } catch (e) {
          // Invalid stored data, continue to real GPS
        }
      }
    }

    // Check if geolocation is supported
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const error: GPSError = {
        code: 'UNSUPPORTED',
        message: 'GEOLOCATION NOT AVAILABLE // SYSTEM LIMITATION',
      };
      setState({ position: null, error, loading: false, lastSnapshot: null });
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const error: GPSError = {
          code: 'TIMEOUT',
          message: 'POSITION TIMEOUT // SNAPSHOT FAILED',
        };
        setState({ position: null, error, loading: false, lastSnapshot: null });
        resolve(null);
      }, 10000); // 10 second timeout

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          const position: GPSPosition = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          };
          setState({
            position,
            error: null,
            loading: false,
            lastSnapshot: Date.now(),
          });
          resolve(position);
        },
        (err) => {
          clearTimeout(timeout);
          let errorCode: GPSError['code'] = 'POSITION_UNAVAILABLE';
          let message = 'POSITION UNAVAILABLE // CHECK DEVICE SETTINGS';

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorCode = 'PERMISSION_DENIED';
              message = 'PERMISSION DENIED // ENABLE LOCATION ACCESS';
              break;
            case err.POSITION_UNAVAILABLE:
              errorCode = 'POSITION_UNAVAILABLE';
              message = 'POSITION UNAVAILABLE // SIGNAL WEAK';
              break;
            case err.TIMEOUT:
              errorCode = 'TIMEOUT';
              message = 'POSITION TIMEOUT // RETRY SNAPSHOT';
              break;
          }

          const error: GPSError = { code: errorCode, message };
          setState({ position: null, error, loading: false, lastSnapshot: null });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // No caching, always fresh snapshot
        }
      );
    });
  }, []);

  const clearPosition = useCallback(() => {
    setState({
      position: null,
      error: null,
      loading: false,
      lastSnapshot: null,
    });
  }, []);

  return {
    ...state,
    requestSnapshot,
    clearPosition,
  };
}
