/**
 * UNMAPPED OS - Tactical Field Operations Interface
 *
 * This is NOT a map screen.
 * This is a tactical execution layer used outdoors, under stress, often offline.
 *
 * The Map Page answers ONE question only:
 * "Where should I move next — and why?"
 *
 * UX Principles:
 * - Zones are the hero, not places
 * - Animation communicates state, not decoration
 * - Reduce information until clarity improves
 * - Make the user feel safe, competent, and in control
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// City pack and device APIs
import { getCityPack, downloadCityPack } from '@/lib/cityPack';
import {
  vibrateDevice,
  VIBRATION_PATTERNS,
  isOnline,
  onConnectionChange,
  getSnapshotPosition,
} from '@/lib/deviceAPI';

// Tactical components
import {
  ContextualHUD,
  TacticalZoneCard,
  FloatingActionButton,
  ZoneEntryToast,
  TouristPressureAlert,
  AnchorReachedOverlay,
  OfflineOverlay,
  PowerConservationBanner,
  TacticalCrisisMode,
  EdgeGlowEffect,
  DayOpsToggle,
  type TacticalZone,
  type Position,
  type OpsMode,
  type GPSStatus,
  type SyncStatus,
  type ZoneEntryToastData,
  type FloatingActionType,
  type CrisisConfig,
  type TacticalMapCanvasRef,
} from '@/components/tactical';
import type { TouristPressureAlert as TouristPressureAlertData } from '@/components/tactical/types';

import type { Zone, CityPack } from '@unmapped/lib';

// Dynamic import for map canvas (avoid SSR issues)
const TacticalMapCanvas = dynamic(() => import('@/components/tactical/TacticalMapCanvas'), {
  ssr: false,
});

// City code mapping
const CITY_CODES: Record<string, string> = {
  tokyo: 'TYO',
  bangkok: 'BKK',
  singapore: 'SIN',
  'hong kong': 'HKG',
  seoul: 'SEL',
  taipei: 'TPE',
  'kuala lumpur': 'KUL',
  hanoi: 'HAN',
  'ho chi minh': 'SGN',
  bali: 'DPS',
};

// Default crisis config (should come from city pack in production)
const DEFAULT_CRISIS_CONFIG: CrisisConfig = {
  police: '110',
  ambulance: '119',
  embassy: '',
  hospital: { name: 'Central Hospital', address: 'Address varies by city' },
  safePhrases: [
    { id: '1', local: 'Help me', english: 'I need help', context: 'Emergency' },
    { id: '2', local: 'Hospital', english: 'Take me to hospital', context: 'Medical' },
    { id: '3', local: 'Police', english: 'Call the police', context: 'Security' },
  ],
};

export default function TacticalFieldDisplay() {
  const router = useRouter();
  const { city } = router.query;
  const mapRef = useRef<TacticalMapCanvasRef>(null);

  // Core state
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsMode, setOpsMode] = useState<OpsMode>('NIGHT');
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('ACTIVE');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('ONLINE');
  const [userPosition, setUserPosition] = useState<Position | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | undefined>(undefined);

  // Zone state
  const [focusedZone, setFocusedZone] = useState<TacticalZone | null>(null);
  const [lastEnteredZoneId, setLastEnteredZoneId] = useState<string | null>(null);

  // UI state
  const [toast, setToast] = useState<ZoneEntryToastData | null>(null);
  const [pressureAlert, setPressureAlert] = useState<TouristPressureAlertData | null>(null);
  const [anchorReached, setAnchorReached] = useState<{ visible: boolean; zoneName?: string }>({
    visible: false,
  });
  const [edgeGlow, setEdgeGlow] = useState<'green' | 'amber' | 'red' | null>(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [powerSaveMode, setPowerSaveMode] = useState(false);

  // Derived state
  const cityKey = useMemo(() => {
    if (typeof city !== 'string') return null;
    return city.toLowerCase().trim();
  }, [city]);

  const cityCode = useMemo(() => {
    if (!cityKey) return 'UNK';
    return CITY_CODES[cityKey] || cityKey.slice(0, 3).toUpperCase();
  }, [cityKey]);

  const localTime = useMemo(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, []);

  // Convert pack zones to tactical zones
  const tacticalZones = useMemo<TacticalZone[]>(() => {
    if (!pack) return [];

    return pack.zones.map((zone: Zone) => {
      const textureMap: Record<string, TacticalZone['texture']> = {
        SILENCE: 'SILENCE',
        ANALOG: 'ANALOG',
        NEON: 'NEON',
        CHAOS: 'CHAOS',
        TRANSIT_HUB: 'TRANSIT_HUB',
      };

      return {
        id: zone.zone_id,
        name: zone.zone_id,
        texture: textureMap[zone.texture_type] || 'UNKNOWN',
        confidence: zone.status === 'ACTIVE' ? 'HIGH' : 'DEGRADED',
        lastVerified: zone.texture_modifiers?.updated_at
          ? new Date(zone.texture_modifiers.updated_at).toLocaleString()
          : null,
        status: zone.status === 'ACTIVE' ? 'ACTIVE' : 'OFFLINE',
        neonColor: zone.neon_color,
        centroid: zone.centroid,
        polygon: zone.polygon,
        anchor: zone.selected_anchor
          ? {
              id: zone.selected_anchor.id || zone.zone_id,
              position: { lat: zone.selected_anchor.lat, lon: zone.selected_anchor.lon },
              distanceMeters: 0, // Calculate based on user position
              bearing: undefined,
            }
          : undefined,
        metrics: {
          footTraffic: 'NORMAL' as const,
          priceBaseline: 'STABLE' as const,
          safetyRating: 85,
        },
      };
    });
  }, [pack]);

  // Primary floating action
  const primaryAction = useMemo<FloatingActionType>(() => {
    if (crisisMode) return null;
    if (focusedZone?.anchor) return 'NAVIGATE_ANCHOR';
    if (focusedZone) return 'ENTER_LOCAL';
    return 'RECENTER';
  }, [focusedZone, crisisMode]);

  // Load city pack
  useEffect(() => {
    if (!cityKey) return;

    const loadPack = async () => {
      setLoading(true);

      // Try cached pack first
      const cached = await getCityPack(cityKey);
      if (cached) {
        setPack(cached);
        setLoading(false);
      }

      // Refresh if online
      if (isOnline()) {
        try {
          await downloadCityPack(cityKey);
          const refreshed = await getCityPack(cityKey);
          if (refreshed) setPack(refreshed);
        } catch (error) {
          console.error('Failed to refresh pack:', error);
        }
      }

      if (!cached && !isOnline()) {
        // No pack and offline
        router.push(`/city/${cityKey}`);
        return;
      }

      setLoading(false);
    };

    loadPack();
  }, [cityKey, router]);

  // Connection monitoring
  useEffect(() => {
    const cleanup = onConnectionChange((online) => {
      setSyncStatus(online ? 'ONLINE' : pack ? 'BLACK_BOX' : 'OFFLINE');
      if (!online) {
        vibrateDevice(VIBRATION_PATTERNS.HAZARD_ALERT);
      }
    });

    setSyncStatus(isOnline() ? 'ONLINE' : pack ? 'BLACK_BOX' : 'OFFLINE');
    return cleanup;
  }, [pack]);

  // GPS tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('DISABLED');
      return;
    }

    let watchId: number;

    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserPosition({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            heading: pos.coords.heading ?? undefined,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
          setGpsStatus('ACTIVE');
        },
        () => {
          setGpsStatus('DEGRADED');
        },
        {
          enableHighAccuracy: !powerSaveMode,
          maximumAge: powerSaveMode ? 60000 : 10000,
          timeout: 20000,
        }
      );
    };

    // Initial snapshot
    getSnapshotPosition().then((pos) => {
      if (pos) {
        setUserPosition({
          lat: pos.lat,
          lon: pos.lon,
          timestamp: Date.now(),
        });
      }
    });

    startTracking();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [powerSaveMode]);

  // Battery monitoring
  useEffect(() => {
    if (!('getBattery' in navigator)) return;

    const checkBattery = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const battery = await (navigator as any).getBattery();
        setBatteryLevel(Math.round(battery.level * 100));

        if (battery.level < 0.15 && !crisisMode) {
          setPowerSaveMode(true);
          setToast({
            id: 'battery',
            title: 'BATTERY CRITICAL',
            body: 'POWER CONSERVATION ACTIVE',
            type: 'warning',
          });
        }

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
          if (battery.level < 0.1) {
            setCrisisMode(true);
          }
        });
      } catch {
        // Battery API not available
      }
    };

    checkBattery();
  }, [crisisMode]);

  // Ambient light sensor for auto day/night mode
  useEffect(() => {
    if (!('AmbientLightSensor' in window)) {
      // Fallback: use time-based detection
      const hour = new Date().getHours();
      setOpsMode(hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT');
      return;
    }

    try {
      // @ts-expect-error - AmbientLightSensor not in TS types
      const sensor = new AmbientLightSensor();
      sensor.addEventListener('reading', () => {
        const lux = sensor.illuminance;
        if (lux > 10000) {
          setOpsMode('DAY');
        } else if (lux < 50) {
          setOpsMode('NIGHT');
        }
      });
      sensor.start();

      return () => sensor.stop();
    } catch {
      // Sensor not available
    }
  }, []);

  // Zone tap handler
  const handleZoneTap = useCallback(
    (zone: TacticalZone) => {
      setFocusedZone(zone);
      vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);

      // Camera focus
      mapRef.current?.focusZone(zone.id);

      // Check if physically entering zone
      if (lastEnteredZoneId !== zone.id && userPosition) {
        const inZone = checkPointInZone(userPosition, zone);
        if (inZone) {
          setLastEnteredZoneId(zone.id);
          handleZoneEntry(zone);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [lastEnteredZoneId, userPosition]
  );

  // Zone entry handler
  const handleZoneEntry = useCallback((zone: TacticalZone) => {
    vibrateDevice(VIBRATION_PATTERNS.ZONE_ENTRY);

    // Determine entry type
    let toastType: ZoneEntryToastData['type'] = 'clear';
    let title = 'ENTERING LOW PRESSURE ZONE';
    let body: string | undefined;

    if (zone.status === 'DEGRADED' || zone.status === 'OFFLINE') {
      toastType = 'warning';
      title = 'ENTERING DEGRADED ZONE';
      body = 'PROCEED WITH CAUTION';
    } else if (zone.metrics.footTraffic === 'HIGH' || zone.metrics.footTraffic === 'EXTREME') {
      toastType = 'watch';
      title = 'ELEVATED ACTIVITY DETECTED';
      body = 'STAY AWARE';
    } else if (zone.metrics.priceBaseline === 'VOLATILE') {
      toastType = 'warning';
      title = 'PRICE PRESSURE DETECTED';
      body = 'VERIFY BEFORE SPENDING';
    }

    setToast({ id: zone.id, title, body, type: toastType });

    // Edge glow effect
    setEdgeGlow(toastType === 'clear' ? 'green' : toastType === 'watch' ? 'amber' : 'red');
    setTimeout(() => setEdgeGlow(null), 900);
  }, []);

  // Anchor reached handler
  const handleAnchorReached = useCallback(
    (zoneId: string) => {
      const zone = tacticalZones.find((z) => z.id === zoneId);
      vibrateDevice(VIBRATION_PATTERNS.ANCHOR_LOCK);
      setAnchorReached({ visible: true, zoneName: zone?.name });
      setFocusedZone(null);
    },
    [tacticalZones]
  );

  // Navigate to anchor
  const handleNavigateToAnchor = useCallback(
    (zoneId: string) => {
      const zone = tacticalZones.find((z) => z.id === zoneId);
      if (zone?.anchor) {
        // Could integrate with external maps or internal routing
        vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
        setToast({
          id: 'nav',
          title: 'NAVIGATION ACTIVE',
          body: `ANCHOR: ${zone.anchor.distanceMeters}m`,
          type: 'clear',
        });
      }
    },
    [tacticalZones]
  );

  // Floating action handler
  const handleFloatingAction = useCallback(() => {
    switch (primaryAction) {
      case 'NAVIGATE_ANCHOR':
        if (focusedZone) handleNavigateToAnchor(focusedZone.id);
        break;
      case 'ENTER_LOCAL':
        // Could open detailed zone view
        vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
        break;
      case 'RECENTER':
        mapRef.current?.clearFocus();
        vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
        break;
      case 'CRISIS_MODE':
        setCrisisMode(true);
        break;
    }
  }, [primaryAction, focusedZone, handleNavigateToAnchor]);

  // Day/Night toggle
  const handleOpsToggle = useCallback(() => {
    setOpsMode((prev) => (prev === 'DAY' ? 'NIGHT' : 'DAY'));
    vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
  }, []);

  // Close zone card
  const handleCloseZone = useCallback(() => {
    setFocusedZone(null);
    mapRef.current?.clearFocus();
  }, []);

  // Crisis mode handlers
  const handleCrisisExit = useCallback(() => {
    setCrisisMode(false);
  }, []);

  const handleCrisisCall = useCallback((type: 'police' | 'ambulance' | 'embassy') => {
    const config = DEFAULT_CRISIS_CONFIG;
    const number =
      type === 'police' ? config.police : type === 'ambulance' ? config.ambulance : config.embassy;
    if (number) {
      window.location.href = `tel:${number}`;
    }
  }, []);

  // Check if point is in zone polygon
  const checkPointInZone = (pos: Position, zone: TacticalZone): boolean => {
    const coords = zone.polygon.coordinates[0] as [number, number][];
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [xi, yi] = coords[i];
      const [xj, yj] = coords[j];
      const intersect =
        yi > pos.lat !== yj > pos.lat && pos.lon < ((xj - xi) * (pos.lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`h-screen flex items-center justify-center ${opsMode === 'DAY' ? 'bg-stone-100' : 'bg-black'}`}
      >
        <div className="text-center font-mono">
          <div className={`text-2xl mb-4 ${opsMode === 'DAY' ? 'text-stone-800' : 'text-white'}`}>
            ◉
          </div>
          <div
            className={`text-sm tracking-widest ${opsMode === 'DAY' ? 'text-stone-600' : 'text-stone-400'}`}
          >
            ACQUIRING LOCAL INTELLIGENCE
          </div>
        </div>
      </div>
    );
  }

  // No pack state
  if (!pack) {
    return (
      <div
        className={`h-screen flex items-center justify-center ${opsMode === 'DAY' ? 'bg-stone-100' : 'bg-black'}`}
      >
        <div className="text-center font-mono p-8">
          <div
            className={`text-xl font-bold mb-4 ${opsMode === 'DAY' ? 'text-stone-800' : 'text-red-400'}`}
          >
            INTEL UNAVAILABLE
          </div>
          <div
            className={`text-sm mb-6 ${opsMode === 'DAY' ? 'text-stone-600' : 'text-stone-400'}`}
          >
            CITY PACK NOT CACHED
          </div>
          <button
            onClick={() => router.push(`/city/${cityKey}`)}
            className={`px-6 py-3 font-bold tracking-wider ${
              opsMode === 'DAY'
                ? 'bg-stone-900 text-white hover:bg-stone-800'
                : 'bg-white text-black hover:bg-stone-200'
            }`}
          >
            ACQUIRE PACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>TACTICAL DISPLAY - {pack.city.toUpperCase()} - UNMAPPED OS</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      {/* Main map container */}
      <div className={`h-screen w-screen overflow-hidden ${opsMode === 'DAY' ? 'day-ops' : ''}`}>
        {/* Contextual HUD Strip */}
        <ContextualHUD
          city={pack.city}
          cityCode={cityCode}
          opsMode={opsMode}
          gpsStatus={gpsStatus}
          syncStatus={syncStatus}
          batteryLevel={batteryLevel}
          localTime={localTime}
        />

        {/* Day/Night Toggle */}
        <DayOpsToggle opsMode={opsMode} onToggle={handleOpsToggle} />

        {/* Tactical Map Canvas */}
        <TacticalMapCanvas
          ref={mapRef}
          zones={tacticalZones}
          userPosition={userPosition}
          opsMode={opsMode}
          focusedZoneId={focusedZone?.id}
          onZoneTap={handleZoneTap}
          onAnchorReached={handleAnchorReached}
          className="h-full w-full"
        />

        {/* Zone Card (Bottom Sheet) */}
        <TacticalZoneCard
          zone={focusedZone}
          opsMode={opsMode}
          onClose={handleCloseZone}
          onNavigateToAnchor={handleNavigateToAnchor}
        />

        {/* Floating Action Button */}
        <FloatingActionButton
          action={primaryAction}
          opsMode={opsMode}
          onPress={handleFloatingAction}
        />

        {/* Zone Entry Toast */}
        <ZoneEntryToast toast={toast} opsMode={opsMode} onDismiss={() => setToast(null)} />

        {/* Tourist Pressure Alert */}
        <TouristPressureAlert
          alert={pressureAlert}
          opsMode={opsMode}
          onDismiss={() => setPressureAlert(null)}
        />

        {/* Edge Glow Effect */}
        <EdgeGlowEffect color={edgeGlow} />

        {/* Anchor Reached Overlay */}
        <AnchorReachedOverlay
          visible={anchorReached.visible}
          zoneName={anchorReached.zoneName}
          opsMode={opsMode}
          onDismiss={() => setAnchorReached({ visible: false })}
        />

        {/* Offline Overlay */}
        <OfflineOverlay
          visible={syncStatus !== 'ONLINE'}
          hasLocalIntel={!!pack}
          opsMode={opsMode}
        />

        {/* Power Conservation Banner */}
        <PowerConservationBanner
          visible={powerSaveMode}
          batteryLevel={batteryLevel}
          opsMode={opsMode}
        />

        {/* Crisis Mode */}
        <TacticalCrisisMode
          active={crisisMode}
          config={DEFAULT_CRISIS_CONFIG}
          onExit={handleCrisisExit}
          onCall={handleCrisisCall}
        />
      </div>
    </>
  );
}
