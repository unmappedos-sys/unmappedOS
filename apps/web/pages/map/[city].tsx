import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { downloadCityPack, getCityPack } from '@/lib/cityPack';
import {
  vibrateDevice,
  openGoogleMaps,
  copyToClipboard,
  VIBRATION_PATTERNS,
  isOnline,
  onConnectionChange,
} from '@/lib/deviceAPI';
import { computeTouristPressureIndex } from '@/lib/intel/touristPressure';
import { getWeatherIcon, type WeatherCategory } from '@/lib/intel/weatherService';
import { useOps } from '@/contexts/OpsContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import StatusPanel from '@/components/StatusPanel';
import TerminalLoader from '@/components/TerminalLoader';
import LanguageSelector from '@/components/LanguageSelector';
import type { Zone, CityPack } from '@unmapped/lib';

// Dynamic import to avoid SSR issues with map library
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

type GPSStatus = 'DISABLED' | 'SNAPSHOT' | 'ACTIVE';
type SyncStatus = 'ONLINE' | 'OFFLINE' | 'BLACK_BOX';

type WeatherSignal = {
  weather: {
    temperature: number;
    apparent_temperature: number;
    humidity: number;
    precipitation: number;
    wind_speed: number;
    wind_gusts: number;
    weather_code: number;
    category: WeatherCategory;
    is_day: boolean;
    timestamp: string;
    description: string;
    icon: string;
  };
  modifiers: {
    walkability_modifier: number;
    safety_modifier: number;
    warning: string | null;
    recommendation: string | null;
  };
};

export default function TacticalDisplay() {
  const router = useRouter();
  const { city } = router.query;
  const { ghostMode, toggleGhostMode, hudCollapsed, toggleHudCollapsed } = useOps();
  const { t, language } = useTranslation();
  const [pack, setPack] = useState<CityPack | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('ACTIVE');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('ONLINE');
  const [showControls, setShowControls] = useState(true);
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  const [weatherSignal, setWeatherSignal] = useState<WeatherSignal | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Helper function to get translated anchor name
  const getAnchorName = (anchor: Zone['selected_anchor']): string => {
    if (!anchor.tags) return anchor.name;

    // Try user's selected language first
    const langKey = `name:${language}`;
    if (anchor.tags[langKey]) return anchor.tags[langKey];

    // Fall back to English
    if (anchor.tags['name:en']) return anchor.tags['name:en'];

    // Fall back to original name
    return anchor.name;
  };

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
          ? 'City pack not found. Download it first from the mission dossier.'
          : 'Offline and no cached city pack found. Connect once to download the pack.'
      );
      router.push(`/city/${cityName}`);
    }
    setLoading(false);
  };

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone);
    vibrateDevice(VIBRATION_PATTERNS.ZONE_ENTRY);
  };

  const handleGhostModeToggle = () => {
    toggleGhostMode();
    vibrateDevice(VIBRATION_PATTERNS.GHOST_MODE_TOGGLE);
  };

  const handleHudToggle = () => {
    toggleHudCollapsed();
    vibrateDevice(VIBRATION_PATTERNS.HUD_TOGGLE);
  };

  const handleAnchorReached = (anchor: Zone['selected_anchor']) => {
    vibrateDevice(VIBRATION_PATTERNS.ANCHOR_LOCK);
    setToast({ title: 'ANCHOR LOCKED', body: `POINT REACHED: ${anchor.name.toUpperCase()}` });
  };

  useEffect(() => {
    const run = async () => {
      if (!pack) return;

      const ref = selectedZone?.centroid || pack.zones[0]?.centroid;
      if (!ref) return;

      setWeatherLoading(true);
      try {
        const url = `/api/weather?lat=${encodeURIComponent(ref.lat)}&lon=${encodeURIComponent(ref.lon)}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          setWeatherSignal(null);
          return;
        }

        const data = (await resp.json()) as WeatherSignal;
        // Defensive: ensure icon exists even if API changes.
        if (!data.weather.icon) {
          data.weather.icon = getWeatherIcon(data.weather.category);
        }
        setWeatherSignal(data);
      } catch {
        setWeatherSignal(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    run();
  }, [pack, selectedZone?.zone_id]);

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
      setToast({
        title: 'MISSION COMPLETE',
        body:
          `YOU AVOIDED A HIGH-PRESSURE ZONE` +
          (savings && savings > 0
            ? ` // SAVINGS ESTIMATED: ${formatMoney(currencyToken, savings)}`
            : ''),
      });
    } else {
      setToast({ title: 'EXTRACT ROUTE SET', body: tpi.recommendation.message });
    }
  };

  const handleExportToMaps = () => {
    if (!selectedZone) return;

    const anchor = selectedZone.selected_anchor;
    openGoogleMaps(anchor.lat, anchor.lon);

    // Copy cheat sheet to clipboard
    const cheatSheet = `
UNMAPPED OS - ${selectedZone.zone_id}
Anchor: ${anchor.name}
Location: ${anchor.lat.toFixed(6)}, ${anchor.lon.toFixed(6)}

CHEAT SHEET:
${selectedZone.cheat_sheet.taxi_phrase}
${selectedZone.cheat_sheet.price_estimates}

EMERGENCY:
Police: ${selectedZone.cheat_sheet.emergency_numbers.police}
Ambulance: ${selectedZone.cheat_sheet.emergency_numbers.ambulance}
Embassy: ${selectedZone.cheat_sheet.emergency_numbers.embassy}
    `.trim();

    copyToClipboard(cheatSheet);
    alert('Cheat sheet copied to clipboard!');
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
                className="font-tactical text-tactical-lg text-ops-night-muted hover:text-ops-neon-green transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Tourist Pressure Index (internal) */}
              {tpi && (
                <div
                  className={`bg-ops-night-surface/50 border p-4 ${
                    tpi.status === 'COMPROMISED'
                      ? 'border-ops-neon-red/30'
                      : tpi.status === 'WATCH'
                        ? 'border-ops-neon-amber/30'
                        : 'border-ops-neon-green/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider">
                      ZONE SIGNAL
                    </h3>
                    <div className="font-mono text-[10px] text-ops-night-muted">
                      TOURIST PRESSURE INDEX
                    </div>
                  </div>

                  <div className="space-y-1 font-mono text-tactical-xs">
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">ZONE STATUS:</span>
                      <span
                        className={
                          tpi.status === 'COMPROMISED'
                            ? 'text-ops-neon-red'
                            : tpi.status === 'WATCH'
                              ? 'text-ops-neon-amber'
                              : 'text-ops-neon-green'
                        }
                      >
                        {tpi.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">TOURIST DENSITY:</span>
                      <span className="text-ops-night-text">{tpi.tourist_density}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">LOCAL ACTIVITY:</span>
                      <span className="text-ops-night-text">{tpi.local_activity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">REASON:</span>
                      <span className="text-ops-night-text">{tpi.reason}</span>
                    </div>
                  </div>

                  {tpi.recommendation && (
                    <div className="mt-3">
                      <div className="font-mono text-tactical-base text-ops-neon-amber/90">
                        {tpi.recommendation.message}
                      </div>
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={handleExtractToNormalPrices}
                          className="btn-tactical-primary flex-1 py-2 text-tactical-xs"
                        >
                          EXTRACT
                        </button>
                        <button
                          onClick={() =>
                            router.push(
                              `/proof?city=${encodeURIComponent(pack.city)}&zone=${encodeURIComponent(selectedZone.zone_id)}`
                            )
                          }
                          className="btn-tactical flex-1 py-2 text-tactical-xs"
                        >
                          PROOF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Weather Signal (dynamic, privacy-safe via server proxy) */}
              {!weatherLoading && weatherSignal && (
                <div className="bg-ops-night-surface/50 border border-ops-neon-cyan/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider">
                      WEATHER SIGNAL
                    </h3>
                    <div className="font-mono text-[10px] text-ops-night-muted">
                      LIVE • OPEN-METEO
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{weatherSignal.weather.icon}</div>
                      <div>
                        <div className="font-mono text-tactical-base text-ops-night-text">
                          {Math.round(weatherSignal.weather.temperature)}°C
                          <span className="text-ops-night-muted"> / feels </span>
                          {Math.round(weatherSignal.weather.apparent_temperature)}°C
                        </div>
                        <div className="font-mono text-tactical-xs text-ops-night-muted">
                          {weatherSignal.weather.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-tactical-xs">
                      <div>
                        <span className="text-ops-night-muted">WALK:</span>{' '}
                        <span className="text-ops-night-text">
                          {weatherSignal.modifiers.walkability_modifier >= 0 ? '+' : ''}
                          {weatherSignal.modifiers.walkability_modifier}
                        </span>
                      </div>
                      <div>
                        <span className="text-ops-night-muted">SAFE:</span>{' '}
                        <span className="text-ops-night-text">
                          {weatherSignal.modifiers.safety_modifier >= 0 ? '+' : ''}
                          {weatherSignal.modifiers.safety_modifier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(weatherSignal.modifiers.warning || weatherSignal.modifiers.recommendation) && (
                    <div className="mt-3 font-mono text-tactical-xs text-ops-neon-amber/90">
                      {weatherSignal.modifiers.warning || weatherSignal.modifiers.recommendation}
                    </div>
                  )}
                </div>
              )}

              {/* Anchor Point */}
              <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 border-2 border-ops-neon-green rounded-full animate-lock" />
                  <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider">
                    {t.anchorPoint.toUpperCase()}
                  </h3>
                </div>
                <p className="font-mono text-tactical-base text-ops-night-text">
                  {getAnchorName(selectedZone.selected_anchor)}
                </p>
                {language !== 'en' &&
                  selectedZone.selected_anchor.tags?.['name:en'] &&
                  getAnchorName(selectedZone.selected_anchor) !==
                    selectedZone.selected_anchor.tags['name:en'] && (
                    <p className="font-mono text-tactical-xs text-ops-neon-cyan/60 mt-1">
                      {selectedZone.selected_anchor.tags['name:en']}
                    </p>
                  )}
                {language === 'en' &&
                  selectedZone.selected_anchor.name !==
                    selectedZone.selected_anchor.tags?.['name:en'] && (
                    <p className="font-mono text-tactical-xs text-ops-night-muted/50 mt-1">
                      {selectedZone.selected_anchor.name}
                    </p>
                  )}
                <p className="font-mono text-tactical-xs text-ops-night-muted mt-1">
                  {selectedZone.selected_anchor.lat.toFixed(6)},{' '}
                  {selectedZone.selected_anchor.lon.toFixed(6)}
                </p>
              </div>

              {/* Price Intel */}
              <div className="bg-ops-night-surface/50 border border-ops-neon-cyan/20 p-4">
                <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider mb-2">
                  {t.priceIntel.toUpperCase()}
                </h3>
                <p className="font-mono text-tactical-xs text-ops-night-muted mb-2">
                  {language === 'en'
                    ? 'Typical prices in this zone:'
                    : language === 'es'
                      ? 'Precios típicos en esta zona:'
                      : language === 'fr'
                        ? 'Prix typiques dans cette zone:'
                        : language === 'de'
                          ? 'Typische Preise in dieser Zone:'
                          : language === 'pt'
                            ? 'Preços típicos nesta zona:'
                            : language === 'ru'
                              ? 'Типичные цены в этой зоне:'
                              : language === 'zh'
                                ? '该地区的典型价格:'
                                : language === 'ja'
                                  ? 'このゾーンの一般的な価格:'
                                  : language === 'ko'
                                    ? '이 구역의 일반적인 가격:'
                                    : language === 'th'
                                      ? 'ราคาโดยทั่วไปในโซนนี้:'
                                      : language === 'ar'
                                        ? 'الأسعار النموذجية في هذه المنطقة:'
                                        : language === 'hi'
                                          ? 'इस क्षेत्र में सामान्य कीमतें:'
                                          : language === 'it'
                                            ? 'Prezzi tipici in questa zona:'
                                            : language === 'nl'
                                              ? 'Typische prijzen in deze zone:'
                                              : language === 'tr'
                                                ? 'Bu bölgedeki tipik fiyatlar:'
                                                : language === 'vi'
                                                  ? 'Giá thông thường trong khu vực này:'
                                                  : language === 'id'
                                                    ? 'Harga umum di zona ini:'
                                                    : language === 'pl'
                                                      ? 'Typowe ceny w tej strefie:'
                                                      : 'Typical prices in this zone:'}
                </p>
                <p className="font-mono text-tactical-base text-ops-neon-cyan/90 leading-relaxed">
                  {selectedZone.cheat_sheet.price_estimates}
                </p>
              </div>

              {/* Taxi Phrase */}
              <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider mb-2">
                  {t.localComms.toUpperCase()}
                </h3>
                <p className="font-mono text-tactical-xs text-ops-night-muted mb-2">
                  {language === 'en'
                    ? 'Show this to taxi drivers:'
                    : language === 'es'
                      ? 'Muestra esto a los taxistas:'
                      : language === 'fr'
                        ? 'Montrez ceci aux chauffeurs de taxi:'
                        : language === 'de'
                          ? 'Zeigen Sie dies Taxifahrern:'
                          : language === 'pt'
                            ? 'Mostre isso aos taxistas:'
                            : language === 'ru'
                              ? 'Покажите это таксистам:'
                              : language === 'zh'
                                ? '给出租车司机看这个:'
                                : language === 'ja'
                                  ? 'タクシー運転手にこれを見せて:'
                                  : language === 'ko'
                                    ? '택시 기사에게 이것을 보여주세요:'
                                    : language === 'th'
                                      ? 'แสดงนี้ให้คนขับแท็กซี่:'
                                      : language === 'ar'
                                        ? 'أظهر هذا لسائقي التاكسي:'
                                        : language === 'hi'
                                          ? 'यह टैक्सी ड्राइवरों को दिखाएं:'
                                          : language === 'it'
                                            ? 'Mostra questo ai tassisti:'
                                            : language === 'nl'
                                              ? 'Toon dit aan taxichauffeurs:'
                                              : language === 'tr'
                                                ? 'Bunu taksi şoförlerine gösterin:'
                                                : language === 'vi'
                                                  ? 'Cho tài xế taxi xem điều này:'
                                                  : language === 'id'
                                                    ? 'Tunjukkan ini kepada pengemudi taksi:'
                                                    : language === 'pl'
                                                      ? 'Pokaż to taksówkarzom:'
                                                      : 'Show this to taxi drivers:'}
                </p>
                <p className="font-mono text-tactical-base text-ops-neon-green/90 leading-relaxed bg-ops-night-bg/50 p-3 rounded border border-ops-neon-green/30">
                  {selectedZone.cheat_sheet.taxi_phrase}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleExportToMaps}
                  className="btn-tactical-primary flex-1 py-3 text-tactical-xs"
                >
                  {t.exportToMaps.toUpperCase()}
                </button>
                <button
                  onClick={() =>
                    router.push(`/report?zone=${selectedZone.zone_id}&city=${pack.city}`)
                  }
                  className="btn-tactical flex-1 py-3 text-tactical-xs"
                >
                  {t.reportHazard.toUpperCase()}
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
