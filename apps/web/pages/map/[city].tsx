/**
 * NEXT MOVE — Primary Experience
 *
 * This is NOT a map app.
 * This is a decision engine.
 *
 * Every time the user opens this, it answers:
 * "What should I do right now to avoid overpaying or being annoyed?"
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';

import { getCityPack, downloadCityPack } from '@/lib/cityPack';
import {
  isOnline,
  onConnectionChange,
  getSnapshotPosition,
  vibrateDevice,
  VIBRATION_PATTERNS,
} from '@/lib/deviceAPI';

import {
  NextMoveCard,
  WhyPanel,
  FeedbackPrompt,
  HelpButton,
  generateRecommendation,
  recordFeedback,
  type Recommendation,
  type Position,
  type HelpInfo,
} from '@/components/nextmove';

import type { CityPack } from '@unmapped/lib';

// Dynamic import for map (only loaded when needed)
const DirectionMap = dynamic(() => import('@/components/nextmove/DirectionMap'), {
  ssr: false,
});

// Feedback timing: 20-45 minutes after recommendation
const FEEDBACK_DELAY_MIN = 20 * 60 * 1000; // 20 minutes
const FEEDBACK_DELAY_MAX = 45 * 60 * 1000; // 45 minutes

export default function NextMovePage() {
  const router = useRouter();
  const { city } = router.query;

  // Core state
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [userPosition, setUserPosition] = useState<Position | null>(null);

  // Recommendation state
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Refs
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);
  const lastRecommendationId = useRef<string | null>(null);

  // City key
  const cityKey = useMemo(() => {
    if (typeof city !== 'string') return null;
    return city.toLowerCase().trim();
  }, [city]);

  // Help info from pack
  const helpInfo = useMemo<HelpInfo>(() => {
    const defaultInfo: HelpInfo = {
      police: '191',
      ambulance: '1669',
    };

    if (!pack || pack.zones.length === 0) return defaultInfo;

    const firstZone = pack.zones[0];
    if (firstZone.cheat_sheet?.emergency_numbers) {
      return {
        police: firstZone.cheat_sheet.emergency_numbers.police || '191',
        ambulance: firstZone.cheat_sheet.emergency_numbers.ambulance || '1669',
        taxiPhrase: firstZone.cheat_sheet.taxi_phrase,
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

  // Get position (snapshot only - no continuous tracking)
  useEffect(() => {
    const getPosition = async () => {
      const pos = await getSnapshotPosition();
      if (pos) {
        setUserPosition({ lat: pos.lat, lon: pos.lon, timestamp: Date.now() });
      }
    };

    getPosition();

    // Update every 2 minutes only (battery conscious)
    const interval = setInterval(getPosition, 120000);
    return () => clearInterval(interval);
  }, []);

  // Generate recommendation when data changes
  useEffect(() => {
    if (!pack) return;

    const rec = generateRecommendation(pack, userPosition ?? undefined, offline);
    setRecommendation(rec);
    lastRecommendationId.current = rec.id;

    // Schedule feedback prompt
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }

    const delay = FEEDBACK_DELAY_MIN + Math.random() * (FEEDBACK_DELAY_MAX - FEEDBACK_DELAY_MIN);
    feedbackTimer.current = setTimeout(() => {
      setShowFeedback(true);
    }, delay);

    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, [pack, userPosition, offline]);

  // Handlers
  const handleShowMe = useCallback(() => {
    if (recommendation?.destination) {
      setShowMap(true);
      vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
    }
  }, [recommendation]);

  const handleWhy = useCallback(() => {
    setShowWhy(true);
    vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
  }, []);

  const handleCloseMap = useCallback(() => {
    setShowMap(false);
  }, []);

  const handleNavigate = useCallback(() => {
    if (recommendation?.destination) {
      const { lat, lon } = recommendation.destination;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    }
  }, [recommendation]);

  const handleFeedbackYes = useCallback(() => {
    if (lastRecommendationId.current) {
      recordFeedback(lastRecommendationId.current, true);
    }
    setShowFeedback(false);
    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
  }, []);

  const handleFeedbackNo = useCallback(() => {
    if (lastRecommendationId.current) {
      recordFeedback(lastRecommendationId.current, false);
    }
    setShowFeedback(false);
    // Silently adjust - maybe generate new recommendation
    if (pack) {
      const rec = generateRecommendation(pack, userPosition ?? undefined, offline);
      setRecommendation(rec);
      lastRecommendationId.current = rec.id;
    }
  }, [pack, userPosition, offline]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // No pack
  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center px-8">
          <p className="text-stone-600 mb-4">No data for this city yet.</p>
          <button
            onClick={() => router.push(`/city/${cityKey}`)}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium"
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
        <title>Next Move — {pack.city}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </Head>

      <div className="min-h-screen flex flex-col bg-white">
        {/* Header */}
        <header className="pt-safe px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-stone-400 tracking-wider uppercase">
              Next Move
            </h1>

            {/* Offline indicator */}
            {offline && (
              <div className="px-3 py-1 bg-stone-100 rounded-full">
                <span className="text-stone-500 text-xs font-medium">Offline</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <NextMoveCard
            recommendation={recommendation}
            onShowMe={handleShowMe}
            onWhy={handleWhy}
            loading={loading}
          />
        </main>

        {/* Footer - City name (subtle) */}
        <footer className="pb-safe px-6 py-4">
          <p className="text-center text-stone-300 text-xs">{pack.city}</p>
        </footer>

        {/* Why Panel */}
        <WhyPanel
          recommendation={recommendation}
          visible={showWhy}
          onClose={() => setShowWhy(false)}
        />

        {/* Direction Map */}
        <DirectionMap
          userPosition={userPosition}
          destination={recommendation?.destination ?? null}
          visible={showMap}
          onClose={handleCloseMap}
          onNavigate={handleNavigate}
        />

        {/* Feedback Prompt */}
        <FeedbackPrompt visible={showFeedback} onYes={handleFeedbackYes} onNo={handleFeedbackNo} />

        {/* Help Button (Always visible) */}
        <HelpButton info={helpInfo} />
      </div>
    </>
  );
}
