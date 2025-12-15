import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { downloadCityPack, getCityPack } from '@/lib/cityPack';
import {
  vibrateDevice,
  openGoogleMaps,
  VIBRATION_PATTERNS,
  isOnline,
  onConnectionChange,
} from '@/lib/deviceAPI';
import { computeTouristPressureIndex } from '@/lib/intel/touristPressure';
import { useOps } from '@/contexts/OpsContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useOperativeMemory } from '@/hooks/useOperativeMemory';
import StatusPanel from '@/components/StatusPanel';
import TerminalLoader from '@/components/TerminalLoader';
import LanguageSelector from '@/components/LanguageSelector';
import OfflineBanner from '@/components/ux/OfflineBanner';
import TouristPressureGauge from '@/components/ux/TouristPressureGauge';
import MissionCompleteOverlay from '@/components/ux/MissionCompleteOverlay';
import DailySummaryOverlay from '@/components/ux/DailySummaryOverlay';
import PriceValidationOverlay from '@/components/ux/PriceValidationOverlay';
import { formatLastVerified, hoursSince } from '@/lib/ux/time';
import {
  bumpAnchorsReached,
  bumpOverpaymentsAvoided,
  bumpZonesExplored,
  loadDailyStats,
} from '@/lib/ux/dailyStats';
import { c } from '@/lib/ux/copy';
import { getBatteryState } from '@/lib/ux/battery';
import { getSessionFlag, setSessionFlag } from '@/lib/ux/sessionFlags';
import type { Zone, CityPack } from '@unmapped/lib';

// Dynamic import to avoid SSR issues with map library
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

type GPSStatus = 'DISABLED' | 'SNAPSHOT' | 'ACTIVE';
type SyncStatus = 'ONLINE' | 'OFFLINE' | 'BLACK_BOX';

export default function TacticalDisplay() {
  const router = useRouter();
  const { city } = router.query;
  const { ghostMode, toggleGhostMode, hudCollapsed, toggleHudCollapsed } = useOps();
  const { t } = useTranslation();
  const { recordZoneVisit, completeMission } = useOperativeMemory();
  const [pack, setPack] = useState<CityPack | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('ACTIVE');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('ONLINE');
  const [showControls, setShowControls] = useState(true);
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  const [lastEntryZoneId, setLastEntryZoneId] = useState<string | null>(null);
  const [anchorReachedZoneId, setAnchorReachedZoneId] = useState<string | null>(null);

  const [edgeGlow, setEdgeGlow] = useState<'green' | 'amber' | 'red' | null>(null);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionLines, setMissionLines] = useState<string[]>([]);

  const [dailyOpen, setDailyOpen] = useState(false);
  const [daily, setDaily] = useState<ReturnType<typeof loadDailyStats> | null>(null);

  const [priceCheckOpen, setPriceCheckOpen] = useState(false);
  const [paidCoffee, setPaidCoffee] = useState('');
  const [priceOverlay, setPriceOverlay] = useState<
    { open: false } | { open: true; mode: 'CONFIRMED' | 'OVER'; deltaText?: string }
  >({ open: false });

  useEffect(() => {
    if (city && typeof city === 'string') {
      loadPack(city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    // Monitor online/offline status
    const cleanup = onConnectionChange((online) => {
      if (online) {
        setSyncStatus('ONLINE');
        vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
      } else {
        setSyncStatus(pack ? 'BLACK_BOX' : 'OFFLINE');
        vibrateDevice(VIBRATION_PATTERNS.HAZARD_ALERT);
      }
    });

    // Initialize sync status
    setSyncStatus(isOnline() ? 'ONLINE' : pack ? 'BLACK_BOX' : 'OFFLINE');

    // Simulate GPS monitoring
    const gpsInterval = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.92) {
        setGpsStatus('SNAPSHOT');
        setTimeout(() => setGpsStatus('ACTIVE'), 2000);
      }
    }, 10000);

    return () => {
      cleanup();
      clearInterval(gpsInterval);
    };
  }, [pack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const runBattery = async () => {
      if (getSessionFlag('battery_low_prompt')) return;
      const b = await getBatteryState();
      if (cancelled) return;
      if (b.level !== null && b.level < 0.2) {
        setSessionFlag('battery_low_prompt', true);
        setToast({
          title: 'BATTERY LOW',
          body: 'CRISIS MODE AVAILABLE // ENABLE GHOST MODE IF NEEDED.',
        });
      }
    };

    const runNightfall = () => {
      if (getSessionFlag('nightfall_prompt')) return;
      const h = new Date().getHours();
      if (h >= 20 || h < 5) {
        setSessionFlag('nightfall_prompt', true);
        setToast({ title: 'NIGHTFALL', body: 'INTEL DEGRADES FASTER. VERIFY BEFORE COMMITTING.' });
      }
    };

    runBattery();
    runNightfall();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) return;
    if (getSessionFlag('no_movement_prompt')) return;

    let last = { lat: 0, lon: 0, t: Date.now() };
    let hasLast = false;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const distanceMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
      const R = 6371000;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (!hasLast) {
          last = { ...here, t: now };
          hasLast = true;
          return;
        }

        const d = distanceMeters(here, last);
        if (d >= 60) {
          last = { ...here, t: now };
          return;
        }

        const minutesStill = (now - last.t) / (1000 * 60);
        if (minutesStill >= 20 && !getSessionFlag('no_movement_prompt')) {
          setSessionFlag('no_movement_prompt', true);
          setToast({
            title: 'NO MOVEMENT DETECTED',
            body: 'NEARBY ANCHOR AVAILABLE. OPEN A ZONE AND NAVIGATE.',
          });
        }
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!selectedZone) return;
    if (getSessionFlag('arrival_intel_prompt')) return;
    if (selectedZone.texture_type === 'TRANSIT_HUB') {
      setSessionFlag('arrival_intel_prompt', true);
      setToast({
        title: 'ARRIVAL INTEL',
        body: 'TRANSIT HUBS OFTEN RUN HIGH PRESSURE. CHECK BEFORE SPENDING.',
      });
    }
  }, [selectedZone?.zone_id, selectedZone?.texture_type]);

  const loadPack = async (cityName: string) => {
    setLoading(true);
    const cityPack = await getCityPack(cityName);

    if (cityPack) {
      // Show cached pack immediately for responsiveness.
      setPack(cityPack);
    }

    // Dynamic-first: when online, refresh the pack even if cached.
    if (isOnline()) {
      try {
        await downloadCityPack(cityName);
        const refreshed = await getCityPack(cityName);
        if (refreshed && refreshed.generated_at !== cityPack?.generated_at) {
          setPack(refreshed);
        }
      } catch (error) {
        console.error('Failed to refresh city pack:', error);
      }
    }

    if (!cityPack && !isOnline()) {
      alert(
        isOnline()
          ? 'City pack not found. Open the city once to cache local intelligence.'
          : 'Offline and no local intelligence cached. Connect once to acquire it.'
      );
      router.push(`/city/${cityName}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!pack) return;
    if (typeof window === 'undefined') return;
    setDaily(loadDailyStats(pack.city));
  }, [pack]);

  useEffect(() => {
    if (!pack || !daily) return;
    if (typeof window === 'undefined') return;

    const now = new Date();
    if (now.getHours() < 21) return;

    const key = `unmappedos_daily_shown_${daily.dateKey}`;
    if (localStorage.getItem(key) === '1') return;
    localStorage.setItem(key, '1');
    setDailyOpen(true);
  }, [daily, pack]);

  const handleZoneClick = (zone: Zone) => {
    if (pack && lastEntryZoneId !== zone.zone_id) {
      setLastEntryZoneId(zone.zone_id);
      bumpZonesExplored(pack.city);
      recordZoneVisit(zone.zone_id, pack.city, false);
    }

    setSelectedZone(zone);
    vibrateDevice(VIBRATION_PATTERNS.ZONE_ENTRY);

    if (pack) {
      const zi = computeTouristPressureIndex(zone, pack.zones);
      if (zi.status === 'CLEAR') {
        setToast({ title: c('zone.lowPressure'), body: c('zone.proceedNormally') });
        setEdgeGlow('green');
      } else if (zi.status === 'WATCH') {
        setToast({ title: c('zone.watch'), body: c('zone.stayAware') });
        setEdgeGlow('amber');
      } else {
        setToast({ title: c('zone.highPressure'), body: c('zone.considerExtract') });
        setEdgeGlow('red');
      }

      window.setTimeout(() => setEdgeGlow(null), 900);
    }
  };

  const handleGhostModeToggle = () => {
    toggleGhostMode();
    vibrateDevice(VIBRATION_PATTERNS.GHOST_MODE_TOGGLE);
  };

  const handleHudToggle = () => {
    toggleHudCollapsed();
    vibrateDevice(VIBRATION_PATTERNS.HUD_TOGGLE);
  };

  const handleAnchorReached = useCallback(
    (anchor: Zone['selected_anchor']) => {
      vibrateDevice(VIBRATION_PATTERNS.ANCHOR_LOCK);

      if (pack) {
        bumpAnchorsReached(pack.city);
        completeMission();
        if (selectedZone) {
          recordZoneVisit(selectedZone.zone_id, pack.city, true);
        }
      }

      setMissionLines([`ANCHOR REACHED: ${anchor.name.toUpperCase()}`]);
      setMissionOpen(true);
    },
    [completeMission, pack, recordZoneVisit, selectedZone]
  );

  useEffect(() => {
    if (!pack || !selectedZone) return;
    if (!('geolocation' in navigator)) return;
    if (anchorReachedZoneId === selectedZone.zone_id) return;

    const anchor = selectedZone.selected_anchor;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const distanceMeters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
      const R = 6371000;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const d = distanceMeters(here, { lat: anchor.lat, lon: anchor.lon });
        if (d <= 80) {
          setAnchorReachedZoneId(selectedZone.zone_id);
          navigator.geolocation.clearWatch(watchId);
          handleAnchorReached(anchor);
        }
      },
      () => {
        // Silent fail.
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [anchorReachedZoneId, handleAnchorReached, pack, selectedZone]);

  // Weather fetching intentionally omitted from the primary zone HUD.

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const tpi = useMemo(() => {
    if (!selectedZone || !pack) return null;
    return computeTouristPressureIndex(selectedZone, pack.zones);
  }, [selectedZone, pack]);

  const parseCoffeeCurrency = (priceEstimates: string): string | null => {
    // Examples: "Coffee ฿60 | Beer ฿80" OR "Coffee SGD5 | Beer SGD12" OR "Coffee ¥400"
    const match = priceEstimates.match(/Coffee\s+([^\d\s]+)?\s*(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const token = (match[1] || '').trim();
    if (token) return token;

    // Handle cases where currency is a 3-letter code directly adjacent to amount, e.g. "SGD5"
    const alt = priceEstimates.match(/Coffee\s+([A-Z]{3})\s*(\d+(?:\.\d+)?)/);
    return alt ? alt[1] : null;
  };

  const formatMoney = (currencyToken: string | null, amount: number): string => {
    const rounded = amount >= 10 ? amount.toFixed(0) : amount.toFixed(1);
    if (!currencyToken) return rounded;
    return /^[A-Z]{3}$/.test(currencyToken)
      ? `${currencyToken}${rounded}`
      : `${currencyToken}${rounded}`;
  };

  const handleExtractToNormalPrices = () => {
    if (!pack || !selectedZone || !tpi?.recommendation) return;

    const target = pack.zones.find((z) => z.zone_id === tpi.recommendation!.target_zone_id) || null;
    openGoogleMaps(tpi.recommendation.target_lat, tpi.recommendation.target_lon);
    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);

    if (!target) {
      setToast({ title: 'EXTRACT ROUTE SET', body: tpi.recommendation.message });
      return;
    }

    const currentCoffee = selectedZone.price_medians?.coffee;
    const targetCoffee = target.price_medians?.coffee;
    const currencyToken = parseCoffeeCurrency(selectedZone.cheat_sheet.price_estimates);
    const savings =
      typeof currentCoffee === 'number' && typeof targetCoffee === 'number'
        ? Math.max(0, currentCoffee - targetCoffee)
        : null;

    if (tpi.status === 'COMPROMISED') {
      bumpOverpaymentsAvoided(pack.city);
      completeMission();
      setMissionLines([
        'TOURIST ZONE AVOIDED',
        savings && savings > 0
          ? `SAVINGS ESTIMATED: ${formatMoney(currencyToken, savings)}`
          : 'INTEL UPDATED',
      ]);
      setMissionOpen(true);
    } else {
      setToast({ title: 'EXTRACT ROUTE SET', body: tpi.recommendation.message });
    }
  };

  const handleVerifyPrice = () => {
    if (!selectedZone) return;
    const baseline = selectedZone.price_medians?.coffee;
    const paid = Number(paidCoffee);
    if (!Number.isFinite(paid) || paid <= 0) {
      setToast({ title: 'INPUT REQUIRED', body: 'ENTER A PRICE TO VERIFY.' });
      return;
    }
    if (typeof baseline !== 'number' || !Number.isFinite(baseline) || baseline <= 0) {
      setToast({ title: 'INTEL DEGRADED', body: 'NO LOCAL BASELINE AVAILABLE FOR THIS ITEM.' });
      return;
    }

    const currencyToken = parseCoffeeCurrency(selectedZone.cheat_sheet.price_estimates);
    const delta = paid - baseline;
    const over = delta > Math.max(0.5, baseline * 0.12);

    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
    setPriceCheckOpen(false);
    setPaidCoffee('');

    if (!over) {
      setPriceOverlay({ open: true, mode: 'CONFIRMED' });
      return;
    }

    const deltaText = `YOU PAID ~${formatMoney(currencyToken, delta)} MORE THAN AVERAGE`;
    setPriceOverlay({ open: true, mode: 'OVER', deltaText });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ops-night-bg">
        <div className="hud-overlay" />
        <div className="max-w-2xl w-full px-6">
          <div className="hud-card">
            <div className="hud-card-header">
              {t.tacticalDisplay.toUpperCase()} {t.systemBooting.toUpperCase()}
            </div>
            <TerminalLoader
              stages={[
                { message: t.initializingMap.toUpperCase() + '...', duration: 600 },
                { message: t.loadingBlackBox.toUpperCase() + '...', duration: 700 },
                { message: 'PARSING ZONE GEOMETRIES...', duration: 800 },
                { message: t.calibratingGPS.toUpperCase() + '...', duration: 600 },
                { message: 'RENDERING TACTICAL OVERLAY...', duration: 500 },
              ]}
              onComplete={() => setLoading(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ops-night-bg">
        <div className="hud-card">
          <div className="hud-card-header">
            {t.critical.toUpperCase()} {t.error.toUpperCase()}
          </div>
          <p className="font-mono text-tactical-base text-ops-critical">
            {t.blackBoxNotFound.toUpperCase()}
          </p>
          <button
            onClick={() => router.push(`/city/${city}`)}
            className="btn-tactical-primary mt-4"
          >
            {t.acquireBlackBox.toUpperCase()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>TACTICAL DISPLAY - {pack.city.toUpperCase()} - UNMAPPED OS</title>
      </Head>

      {/* HUD Overlay */}
      <div className="hud-overlay" />

      {/* Scan Line Effect */}
      <div className="scan-line" />

      <OfflineBanner
        visible={syncStatus !== 'ONLINE'}
        mode={syncStatus === 'BLACK_BOX' ? 'BLACK_BOX' : 'OFFLINE'}
      />

      <MissionCompleteOverlay
        open={missionOpen}
        onClose={() => setMissionOpen(false)}
        lines={missionLines}
      />

      <PriceValidationOverlay
        open={priceOverlay.open}
        onClose={() => setPriceOverlay({ open: false })}
        mode={priceOverlay.open ? priceOverlay.mode : 'CONFIRMED'}
        deltaText={priceOverlay.open ? priceOverlay.deltaText : undefined}
      />

      <DailySummaryOverlay
        open={dailyOpen}
        onClose={() => setDailyOpen(false)}
        city={pack.city}
        zonesExplored={daily?.zonesExplored ?? 0}
        anchorsReached={daily?.anchorsReached ?? 0}
        overpaymentsAvoided={daily?.overpaymentsAvoided ?? 0}
      />

      {edgeGlow && (
        <div className="fixed inset-0 pointer-events-none z-[65]">
          <div
            className={`absolute inset-4 border-2 ${
              edgeGlow === 'green'
                ? 'border-ops-neon-green/25'
                : edgeGlow === 'amber'
                  ? 'border-ops-neon-amber/25'
                  : 'border-ops-neon-red/25'
            }`}
          />
        </div>
      )}

      {/* HUD Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]">
          <div className="hud-card px-4 py-3 min-w-[260px] border border-ops-neon-green/30">
            <div className="font-tactical text-tactical-xs text-ops-neon-green uppercase tracking-widest">
              {toast.title}
            </div>
            {toast.body && (
              <div className="mt-1 font-mono text-tactical-xs text-ops-night-text-dim">
                {toast.body}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-screen flex flex-col relative">
        {/* Top HUD Bar */}
        <div className="bg-ops-night-surface/90 backdrop-blur-tactical border-b border-ops-neon-green/30 p-3 flex items-center justify-between z-20 neon-border-top">
          <button
            onClick={() => router.back()}
            className="btn-tactical-ghost text-tactical-xs px-4 py-2"
          >
            ← {t.abortMission.toUpperCase()}
          </button>
          <h1 className="font-tactical text-tactical-base text-ops-neon-cyan uppercase tracking-widest">
            {pack.city} {t.tacticalDisplay.toUpperCase()}
            <span className="ml-3 font-mono text-[10px] text-ops-neon-green/80 align-middle">
              LOCAL MODE — ACTIVE
            </span>
          </h1>
          <button
            onClick={() => router.push('/operative')}
            className="btn-tactical-ghost text-tactical-xs px-4 py-2"
          >
            {t.operative.toUpperCase()}
          </button>
        </div>

        {/* Language Selector - Top Left */}
        <div className="absolute top-16 left-4 z-50">
          <LanguageSelector />
        </div>

        {/* GPS Status Panel - Top Left */}
        {!hudCollapsed && (
          <div className="diagnostic-panel top-32 left-4 z-40">
            <StatusPanel gpsStatus={gpsStatus} syncStatus={syncStatus} />
          </div>
        )}

        {/* Ghost Mode Panel - Top Right */}
        {!hudCollapsed && (
          <div className="diagnostic-panel top-16 right-4 z-40">
            <div className="space-y-2">
              <div className={`status-indicator ${ghostMode ? 'active' : 'ghost'}`}>
                {t.ghostMode.toUpperCase()}:{' '}
                {ghostMode ? t.ghostModeActive.toUpperCase() : t.ghostModeDisengaged.toUpperCase()}
              </div>
              <button
                onClick={handleGhostModeToggle}
                className="font-tactical text-tactical-xs text-ops-neon-cyan hover:text-ops-neon-green transition-colors uppercase tracking-wider cursor-pointer w-full text-left"
              >
                [TOGGLE]
              </button>
            </div>
          </div>
        )}

        {/* HUD Collapsed Indicator - Bottom Right */}
        {hudCollapsed && (
          <div className="diagnostic-panel bottom-4 right-4 z-40">
            <button
              onClick={handleHudToggle}
              className="font-tactical text-tactical-xs text-ops-neon-green hover:text-ops-neon-cyan transition-colors uppercase tracking-wider"
            >
              {t.expandHud.toUpperCase()}
              <br />
              <span className="text-tactical-xs text-ops-night-muted">FULL VISUAL FIELD</span>
            </button>
          </div>
        )}

        {/* Zone Count Panel - Bottom Left */}
        {!hudCollapsed && (
          <div className="diagnostic-panel bottom-4 left-4 z-40">
            <div className="space-y-1">
              <div className="font-tactical text-tactical-xs text-ops-neon-green uppercase tracking-wider">
                {t.zonesLoaded.toUpperCase()}
              </div>
              <div className="font-tactical text-2xl text-ops-neon-green">{pack.zones.length}</div>
              <div className="font-mono text-[10px] text-ops-night-muted">
                {pack.city.toUpperCase()} THEATER
              </div>
            </div>
          </div>
        )}

        {/* Tactical Controls Toggle */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="fixed top-1/2 right-0 -translate-y-1/2 bg-ops-night-surface/90 backdrop-blur-tactical border border-ops-neon-green/30 border-r-0 px-2 py-6 z-40 hover:bg-ops-neon-green/10 transition-colors group"
        >
          <div className="font-tactical text-tactical-xs text-ops-neon-green rotate-90 group-hover:text-ops-neon-cyan transition-colors">
            {showControls ? 'HIDE' : 'SHOW'}
          </div>
        </button>

        {/* Tactical Control Panel */}
        {showControls && (
          <div className="fixed top-1/2 right-4 -translate-y-1/2 w-64 z-40 animate-slide-in">
            <div className="hud-card">
              <div className="hud-card-header">{t.tacticalDisplay.toUpperCase()} CONTROLS</div>
              <div className="space-y-3">
                <button
                  onClick={handleHudToggle}
                  className={`btn-tactical w-full py-2 text-tactical-xs ${
                    hudCollapsed ? '' : 'bg-ops-neon-green/20 border-ops-neon-green'
                  }`}
                >
                  {hudCollapsed ? t.expandHud.toUpperCase() : '✓ ' + t.collapseHud.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapComponent
            city={pack.city}
            zones={pack.zones}
            onZoneClick={handleZoneClick}
            onAnchorReached={handleAnchorReached}
          />
        </div>

        {/* Zone Intel Panel */}
        {selectedZone && (
          <div className="hud-card m-4 max-h-80 overflow-y-auto z-50 animate-slide-in neon-border-top">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h2 className="font-tactical text-tactical-lg text-ops-neon-green uppercase tracking-widest">
                  {selectedZone.zone_id}
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`status-indicator ${
                      selectedZone.status === 'ACTIVE' ? 'active' : 'critical'
                    }`}
                  >
                    {selectedZone.status}
                  </div>
                  <div className="font-mono text-tactical-xs text-ops-night-muted">
                    {t.zoneLocked.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="btn-tactical-ghost px-3 py-2 text-tactical-xs"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4 font-mono text-tactical-xs">
                <div className="flex justify-between">
                  <span className="text-ops-night-muted">CONFIDENCE:</span>
                  <span className="text-ops-night-text">
                    {(() => {
                      const h = hoursSince(selectedZone.texture_modifiers?.updated_at || null);
                      if (h === null) return 'UNKNOWN';
                      if (h <= 6) return 'HIGH';
                      if (h <= 24) return 'MEDIUM';
                      return 'DEGRADED';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-ops-night-muted">LAST VERIFIED:</span>
                  <span className="text-ops-night-text">
                    {formatLastVerified(
                      hoursSince(selectedZone.texture_modifiers?.updated_at || null)
                    )}
                  </span>
                </div>
              </div>

              {tpi && <TouristPressureGauge tpi={tpi} />}

              <div className="space-y-3">
                {tpi?.status === 'COMPROMISED' && tpi.recommendation ? (
                  <button
                    onClick={handleExtractToNormalPrices}
                    className="btn-tactical-primary w-full py-3 text-tactical-xs"
                  >
                    EXTRACT TO NORMAL PRICES
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
                      openGoogleMaps(
                        selectedZone.selected_anchor.lat,
                        selectedZone.selected_anchor.lon
                      );
                    }}
                    className="btn-tactical-primary w-full py-3 text-tactical-xs"
                  >
                    {c('startHere.navigate')}
                  </button>
                )}

                <button
                  onClick={() => setPriceCheckOpen((v) => !v)}
                  className="btn-tactical-ghost w-full py-2 text-[10px]"
                >
                  {priceCheckOpen ? 'HIDE PRICE CHECK' : 'VERIFY A PRICE'}
                </button>

                {priceCheckOpen && (
                  <div className="bg-ops-night-surface/50 border border-ops-neon-cyan/20 p-4">
                    <div className="font-tactical text-tactical-xs text-ops-neon-cyan uppercase tracking-widest">
                      PRICE VALIDATION
                    </div>
                    <div className="mt-3 space-y-2">
                      <input
                        value={paidCoffee}
                        onChange={(e) => setPaidCoffee(e.target.value)}
                        inputMode="decimal"
                        placeholder="COFFEE PRICE (NUMBER)"
                        className="input-tactical"
                      />
                      <button
                        onClick={handleVerifyPrice}
                        className="btn-tactical-primary w-full py-3 text-tactical-xs"
                      >
                        VERIFY
                      </button>
                      <div className="font-mono text-[10px] text-ops-night-muted">
                        BASELINE USES LOCAL MEDIAN WHEN AVAILABLE.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    router.push(
                      `/proof?city=${encodeURIComponent(pack.city)}&zone=${encodeURIComponent(selectedZone.zone_id)}`
                    )
                  }
                  className="btn-tactical flex-1 py-3 text-tactical-xs"
                >
                  PROOF
                </button>
                <button
                  onClick={() =>
                    router.push(`/report?zone=${selectedZone.zone_id}&city=${pack.city}`)
                  }
                  className="btn-tactical flex-1 py-3 text-tactical-xs"
                >
                  REPORT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}
