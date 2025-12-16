export function requestGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export async function getSnapshotPosition(): Promise<{ lat: number; lon: number } | null> {
  try {
    const position = await requestGeolocation();
    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
}

/**
 * Vibrate device with pattern
 *
 * Patterns:
 * - Light click: 40ms (ghost mode toggle, button press)
 * - Confirm: 120ms (intel submission, form submit)
 * - Anchor lock: 500ms (anchor reached, major milestone)
 * - Double heartbeat: [200, 100, 200] (zone entry, notification)
 * - Triple tap: [100, 80, 100, 80, 100] (hazard report, alert)
 *
 * @param pattern - Duration in ms or array of [vibrate, pause, vibrate, ...]
 */
export function vibrateDevice(pattern: number | number[]): void {
  // Check if vibration API exists and is enabled
  if (!navigator.vibrate) {
    // Fallback: No-op on unsupported devices
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Fallback: Silent fail if vibration blocked by user settings
    console.debug('Vibration unavailable:', error);
  }
}

/**
 * Vibration presets for common interactions
 */
export const VIBRATION_PATTERNS = {
  LIGHT_CLICK: 40,
  CONFIRM: 120,
  ANCHOR_LOCK: 500,
  ZONE_ENTRY: [200, 100, 200] as number[],
  HAZARD_ALERT: [100, 80, 100, 80, 100] as number[],
  GHOST_MODE_TOGGLE: 40,
  HUD_TOGGLE: 60,
} as const;

// SSR-safe check
const isBrowser = typeof window !== 'undefined';

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  if (!isBrowser) return true; // Assume online during SSR
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onConnectionChange(callback: (online: boolean) => void): () => void {
  if (!isBrowser) return () => {}; // No-op during SSR

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function copyToClipboard(text: string): Promise<void> {
  if (!isBrowser) return Promise.resolve();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}

export function openGoogleMaps(lat: number, lon: number): void {
  if (!isBrowser) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  window.open(url, '_blank');
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser || !('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isBrowser) return;
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export function scheduleCheckIn(anchorName: string, minutes: number = 45): void {
  if (!isBrowser) return;
  const checkInTime = Date.now() + minutes * 60 * 1000;
  localStorage.setItem('activeTrip', JSON.stringify({ anchorName, checkInTime }));

  setTimeout(
    () => {
      showNotification('Check-In Reminder', {
        body: `Have you reached ${anchorName}? Verify prices to earn karma.`,
        icon: '/icon-192.png',
        tag: 'check-in',
      });
    },
    minutes * 60 * 1000
  );
}

export function clearActiveTrip(): void {
  if (!isBrowser) return;
  localStorage.removeItem('activeTrip');
}

export function getActiveTrip(): { anchorName: string; checkInTime: number } | null {
  if (!isBrowser) return null;
  const trip = localStorage.getItem('activeTrip');
  return trip ? JSON.parse(trip) : null;
}
