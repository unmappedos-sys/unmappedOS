/**
 * LOCAL SENSE - Map Page
 *
 * A calm, human-centered map experience.
 * One sentence. Gentle suggestions. Invisible intelligence.
 *
 * This UX feels:
 * - calm
 * - human
 * - intuitive
 * - reassuring
 * - quietly intelligent
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';

import { getCityPack, downloadCityPack } from '@/lib/cityPack';
import {
  vibrateDevice,
  VIBRATION_PATTERNS,
  isOnline,
  onConnectionChange,
  getSnapshotPosition,
} from '@/lib/deviceAPI';

import {
  AdaptiveSentence,
  ContextWhisper,
  HelpButton,
  LongPressDetails,
  generateSentence,
  generateWhisper,
  convertZoneToLocalArea,
  type LocalArea,
  type Position,
  type Whisper,
  type HelpInfo,
  type LocalSenseMapRef,
} from '@/components/localsense';
import type { AdaptiveSentence as AdaptiveSentenceType } from '@/components/localsense/types';

import type { CityPack } from '@unmapped/lib';

// Dynamic import for map
const LocalSenseMap = dynamic(() => import('@/components/localsense/LocalSenseMap'), {
  ssr: false,
});

export default function LocalSenseMapPage() {
  const router = useRouter();
  const { city } = router.query;
  const mapRef = useRef<LocalSenseMapRef>(null);

  // Core state
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [userPosition, setUserPosition] = useState<Position | null>(null);

  // UI state
  const [sentence, setSentence] = useState<AdaptiveSentenceType | null>(null);
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const [selectedArea, setSelectedArea] = useState<LocalArea | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [longPressArea, setLongPressArea] = useState<LocalArea | null>(null);
  const [longPressPos, setLongPressPos] = useState({ x: 0, y: 0 });
  const [showLongPress, setShowLongPress] = useState(false);

  // Long press timer
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef(0);

  // City key
  const cityKey = useMemo(() => {
    if (typeof city !== 'string') return null;
    return city.toLowerCase().trim();
  }, [city]);

  // Convert zones to local areas
  const areas = useMemo<LocalArea[]>(() => {
    if (!pack) return [];
    return pack.zones.map(convertZoneToLocalArea);
  }, [pack]);

  // Help info from pack
  const helpInfo = useMemo<HelpInfo>(() => {
    const defaultInfo: HelpInfo = {
      police: '110',
      ambulance: '119',
      phrases: [],
    };

    if (!pack || pack.zones.length === 0) return defaultInfo;

    const firstZone = pack.zones[0];
    if (firstZone.cheat_sheet?.emergency_numbers) {
      return {
        police: firstZone.cheat_sheet.emergency_numbers.police || '110',
        ambulance: firstZone.cheat_sheet.emergency_numbers.ambulance || '119',
        phrases: firstZone.cheat_sheet.taxi_phrase
          ? [
              {
                local: firstZone.cheat_sheet.taxi_phrase,
                english: 'Take me to...',
                context: 'Show to taxi driver',
              },
            ]
          : [],
      };
    }

    return defaultInfo;
  }, [pack]);

  // Load city pack
  useEffect(() => {
    if (!cityKey) return;

    const loadPack = async () => {
      setLoading(true);

      const cached = await getCityPack(cityKey);
      if (cached) {
        setPack(cached);
        setLoading(false);
      }

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
      setOffline(!online);
    });
    setOffline(!isOnline());
    return cleanup;
  }, []);

  // GPS (snapshot only - no continuous tracking)
  useEffect(() => {
    const getPosition = async () => {
      const pos = await getSnapshotPosition();
      if (pos) {
        setUserPosition({ lat: pos.lat, lon: pos.lon, timestamp: Date.now() });
      }
    };

    getPosition();

    // Update every 30 seconds only
    const interval = setInterval(getPosition, 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate sentence when context changes
  useEffect(() => {
    if (areas.length === 0) return;

    const newSentence = generateSentence(areas, userPosition, offline);
    setSentence(newSentence);
  }, [areas, userPosition, offline]);

  // Area tap handler
  const handleAreaTap = useCallback(
    (area: LocalArea, screenPos: { x: number; y: number }) => {
      // Clear long press
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Track taps
      if (selectedArea?.id === area.id) {
        tapCount.current++;
      } else {
        tapCount.current = 1;
        setSelectedArea(area);
        setShowNavigation(false);
      }

      // First tap: show whisper
      if (tapCount.current === 1) {
        const whisperText = generateWhisper(area);
        setWhisper({
          id: area.id,
          text: whisperText,
          position: screenPos,
          areaId: area.id,
        });
        vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
      }

      // Second tap: show navigation
      if (tapCount.current >= 2) {
        setShowNavigation(true);
        vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
      }

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        setLongPressArea(area);
        setLongPressPos(screenPos);
        setShowLongPress(true);
        vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
      }, 600);
    },
    [selectedArea]
  );

  // Handle navigation
  const handleNavigate = useCallback((area: LocalArea) => {
    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);

    // Open in native maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${area.center.lat},${area.center.lon}`;
    window.open(url, '_blank');
  }, []);

  // Dismiss whisper
  const handleDismissWhisper = useCallback(() => {
    setWhisper(null);
    setSelectedArea(null);
    setShowNavigation(false);
    tapCount.current = 0;
  }, []);

  // Dismiss long press
  const handleDismissLongPress = useCallback(() => {
    setShowLongPress(false);
    setLongPressArea(null);
  }, []);

  // Map move handler - subtle haptic when entering good area
  const handleMapMove = useCallback(() => {
    // Could add subtle feedback here
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm">Loading local info...</p>
        </div>
      </div>
    );
  }

  // No pack state
  if (!pack) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center px-8">
          <p className="text-stone-600 mb-4">No local info available.</p>
          <button
            onClick={() => router.push(`/city/${cityKey}`)}
            className="px-6 py-3 bg-stone-800 text-white rounded-xl text-sm font-medium"
          >
            Download first
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pack.city} — Unmapped</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      <div className="h-screen w-screen overflow-hidden bg-stone-50 relative">
        {/* Adaptive Sentence (Top) */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-safe">
          <AdaptiveSentence sentence={sentence} isOffline={offline} />
        </div>

        {/* Map */}
        <LocalSenseMap
          ref={mapRef}
          areas={areas}
          userPosition={userPosition}
          isOffline={offline}
          onAreaTap={handleAreaTap}
          onMapMove={handleMapMove}
          className="absolute inset-0"
        />

        {/* Context Whisper */}
        <ContextWhisper
          whisper={whisper}
          area={selectedArea}
          showNavigation={showNavigation}
          onNavigate={handleNavigate}
          onDismiss={handleDismissWhisper}
        />

        {/* Long Press Details */}
        <LongPressDetails
          area={longPressArea}
          visible={showLongPress}
          position={longPressPos}
          onDismiss={handleDismissLongPress}
        />

        {/* Help Button (Bottom Right) */}
        <div className="absolute bottom-6 right-6 z-20 pb-safe">
          <HelpButton info={helpInfo} />
        </div>

        {/* Offline indicator - very subtle */}
        {offline && (
          <div className="absolute bottom-6 left-6 z-20 pb-safe">
            <div className="bg-stone-200/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-stone-500 text-xs">Offline</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
