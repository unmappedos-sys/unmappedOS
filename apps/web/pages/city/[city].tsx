import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import type { CityPack, Zone } from '@unmapped/lib';
import { downloadCityPack, getCityPack } from '@/lib/cityPack';
import { computeTouristPressureIndex } from '@/lib/intel/touristPressure';
import {
  isOnline,
  onConnectionChange,
  openGoogleMaps,
  vibrateDevice,
  VIBRATION_PATTERNS,
} from '@/lib/deviceAPI';
import TouristPressureGauge from '@/components/ux/TouristPressureGauge';
import { formatHHMM } from '@/lib/ux/time';
import { c } from '@/lib/ux/copy';

const CITIES = {
  bangkok: {
    name: 'Bangkok',
    code: 'BKK',
    country: 'Thailand',
    zones: 12,
    description: 'Dense commercial networks. High transit connectivity. Variable pricing zones.',
    threat: 'MODERATE',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '191',
      ambulance: '1669',
      embassy: '+66-2-205-4000',
    },
  },
  tokyo: {
    name: 'Tokyo',
    code: 'TYO',
    country: 'Japan',
    zones: 15,
    description: 'Ultra-dense metro system. Precise anchor points. Structured zones.',
    threat: 'LOW',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '110',
      ambulance: '119',
      embassy: '+81-3-3224-5000',
    },
  },
  singapore: {
    name: 'Singapore',
    code: 'SIN',
    country: 'Singapore',
    zones: 0,
    description: 'High-compliance city grid. Strong transit reliability. Dense operational hubs.',
    threat: 'LOW',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '999',
      ambulance: '995',
      embassy: '+65-6476-9100',
    },
  },
  hongkong: {
    name: 'Hong Kong',
    code: 'HKG',
    country: 'Hong Kong',
    zones: 0,
    description: 'Vertical density. Fast interchanges. High-signal commercial corridors.',
    threat: 'MODERATE',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '999',
      ambulance: '999',
      embassy: '+852-2523-9011',
    },
  },
  seoul: {
    name: 'Seoul',
    code: 'SEL',
    country: 'South Korea',
    zones: 0,
    description: 'High-bandwidth nightlife districts. Strong subway coverage. Rapid zone shifts.',
    threat: 'LOW',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '112',
      ambulance: '119',
      embassy: '+82-2-397-4114',
    },
  },
  bali: {
    name: 'Bali',
    code: 'DPS',
    country: 'Indonesia',
    zones: 0,
    description: 'Tourist density pockets. Transport dependence. Variable price gradients.',
    threat: 'MODERATE',
    classification: 'TIER-2 REGION',
    emergency: {
      police: '110',
      ambulance: '118',
      embassy: '+62-361-233-605',
    },
  },
  kualalumpur: {
    name: 'Kuala Lumpur',
    code: 'KUL',
    country: 'Malaysia',
    zones: 0,
    description: 'Transit-linked business core. Market spillover zones. Mixed-density corridors.',
    threat: 'LOW',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '999',
      ambulance: '999',
      embassy: '+60-3-2168-5000',
    },
  },
  hanoi: {
    name: 'Hanoi',
    code: 'HAN',
    country: 'Vietnam',
    zones: 0,
    description: 'Old-quarter maze. Lake-centric flow. Strong street-level vitality bands.',
    threat: 'MODERATE',
    classification: 'TIER-2 METRO',
    emergency: {
      police: '113',
      ambulance: '115',
      embassy: '+84-24-3850-5000',
    },
  },
  hochiminh: {
    name: 'Ho Chi Minh City',
    code: 'SGN',
    country: 'Vietnam',
    zones: 0,
    description: 'High-mobility street network. Late-night commerce. High signal volatility.',
    threat: 'MODERATE',
    classification: 'TIER-2 METRO',
    emergency: {
      police: '113',
      ambulance: '115',
      embassy: '+84-28-3520-4200',
    },
  },
  taipei: {
    name: 'Taipei',
    code: 'TPE',
    country: 'Taiwan',
    zones: 0,
    description: 'Night market density. MRT-connected districts. Fast elevation escapes.',
    threat: 'LOW',
    classification: 'TIER-1 METRO',
    emergency: {
      police: '110',
      ambulance: '119',
      embassy: '+886-2-2162-2000',
    },
  },
};

export default function CityDossier() {
  const router = useRouter();
  const { city } = router.query;
  const [pack, setPack] = useState<CityPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadStage, setDownloadStage] = useState<string | null>(null);
  const [sync, setSync] = useState<'ONLINE' | 'OFFLINE' | 'BLACK_BOX'>('ONLINE');
  const [refZone, setRefZone] = useState<Zone | null>(null);
  const [weatherLine, setWeatherLine] = useState<string>('UNKNOWN');

  const rawCity = typeof city === 'string' ? city : null;
  const cityKey = rawCity
    ? rawCity
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
    : null;

  const knownCityData = cityKey ? (CITIES[cityKey as keyof typeof CITIES] ?? null) : null;

  const displayName =
    knownCityData?.name ||
    (rawCity
      ? rawCity
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      : 'UNKNOWN');

  const displayCode =
    knownCityData?.code || (cityKey ? cityKey.slice(0, 3).toUpperCase().padEnd(3, 'X') : 'XXX');

  const cityData =
    knownCityData ||
    (cityKey
      ? {
          name: displayName,
          code: displayCode,
          country: 'LIVE THEATER',
          zones: 12,
          description:
            'LIVE MODE // City pack will be bootstrapped on-demand from public map data. Cache is stored locally for this device.',
          threat: 'LOW',
          classification: 'LIVE BOOTSTRAP',
          emergency: {
            police: '112',
            ambulance: '112',
            embassy: '112',
          },
        }
      : null);

  useEffect(() => {
    if (city && typeof city !== 'string') {
      router.push('/cities');
    }
  }, [city, router]);

  useEffect(() => {
    const cleanup = onConnectionChange((online) => {
      if (online) {
        setSync('ONLINE');
      } else {
        setSync(pack ? 'BLACK_BOX' : 'OFFLINE');
      }
    });
    setSync(isOnline() ? 'ONLINE' : pack ? 'BLACK_BOX' : 'OFFLINE');
    return cleanup;
  }, [pack]);

  useEffect(() => {
    const run = async () => {
      if (!cityKey) return;
      setLoading(true);
      const cached = await getCityPack(cityKey);
      if (cached) {
        setPack(cached);
      }
      setLoading(false);
    };

    run();
  }, [cityKey]);

  useEffect(() => {
    const resolveRef = async () => {
      if (!pack) {
        setRefZone(null);
        return;
      }

      // Prefer the nearest zone to the user's current position for personal relevance.
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            let best: { z: Zone; d: number } | null = null;

            for (const z of pack.zones) {
              const d = (z.centroid.lat - lat) ** 2 + (z.centroid.lon - lon) ** 2;
              if (!best || d < best.d) best = { z, d };
            }

            setRefZone(best?.z ?? pack.zones[0] ?? null);
          },
          () => {
            setRefZone(pack.zones[0] ?? null);
          },
          { enableHighAccuracy: false, maximumAge: 15000, timeout: 8000 }
        );
        return;
      }

      setRefZone(pack.zones[0] ?? null);
    };

    resolveRef();
  }, [pack]);

  useEffect(() => {
    const run = async () => {
      if (!pack || !refZone) return;
      try {
        const url = `/api/weather?lat=${encodeURIComponent(refZone.centroid.lat)}&lon=${encodeURIComponent(
          refZone.centroid.lon
        )}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          setWeatherLine('UNKNOWN');
          return;
        }
        const data = await resp.json();
        const temp =
          typeof data?.weather?.temperature === 'number'
            ? Math.round(data.weather.temperature)
            : null;
        const desc =
          typeof data?.weather?.description === 'string' ? data.weather.description : null;
        if (temp === null || !desc) {
          setWeatherLine('UNKNOWN');
          return;
        }
        setWeatherLine(`${temp}°C // ${String(desc).toUpperCase()}`);
      } catch {
        setWeatherLine('UNKNOWN');
      }
    };

    run();
  }, [pack, refZone]);

  const tpi = useMemo(() => {
    if (!pack || !refZone) return null;
    return computeTouristPressureIndex(refZone, pack.zones);
  }, [pack, refZone]);

  const startHere = useMemo(() => {
    if (!pack) return null;

    let best: {
      zone: Zone;
      score: number;
      tpi: ReturnType<typeof computeTouristPressureIndex>;
    } | null = null;
    for (const z of pack.zones) {
      if (!z.selected_anchor) continue;
      if (z.status !== 'ACTIVE') continue;

      const zi = computeTouristPressureIndex(z, pack.zones);
      const scoreBase = zi.status === 'CLEAR' ? 3 : zi.status === 'WATCH' ? 1 : -2;
      const local = zi.local_activity === 'HIGH' ? 2 : zi.local_activity === 'MEDIUM' ? 1 : 0;
      const tourist = zi.tourist_density === 'LOW' ? 2 : zi.tourist_density === 'MEDIUM' ? 1 : 0;
      const price =
        zi.price_delta_pct === null
          ? 0
          : zi.price_delta_pct <= 5
            ? 2
            : zi.price_delta_pct <= 15
              ? 1
              : -1;

      const s = scoreBase + local + tourist + price;
      if (!best || s > best.score) best = { zone: z, score: s, tpi: zi };
    }

    if (!best) return null;
    const whyParts: string[] = [];
    if (best.tpi.price_delta_pct !== null && best.tpi.price_delta_pct <= 5)
      whyParts.push('FAIR PRICES');
    else whyParts.push('STABLE PRICES');
    if (best.tpi.local_activity !== 'LOW') whyParts.push('LOCAL FOOT TRAFFIC');
    return { zone: best.zone, why: whyParts.join(' • ') };
  }, [pack]);

  const handleDownload = async () => {
    if (!cityKey) return;

    setDownloading(true);
    setDownloadStage('INITIALIZING...');

    try {
      const steps = ['REQUESTING PACK...', 'CACHING LOCALLY...', 'VERIFICATION COMPLETE'];
      for (const step of steps) {
        setDownloadStage(step);
        await new Promise((resolve) => setTimeout(resolve, 380));
      }

      await downloadCityPack(cityKey);
      const refreshed = await getCityPack(cityKey);
      setPack(refreshed);
      setDownloading(false);
      setDownloadStage(null);
      vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
    } catch (error) {
      console.error('Pack download failed:', error);
      alert('LOCAL INTELLIGENCE ACQUISITION FAILED.');
      setDownloading(false);
      setDownloadStage(null);
    }
  };

  if (!cityData || !cityKey) return null;

  const now = new Date();
  const statusLine =
    sync === 'ONLINE' ? 'OPERATIONAL' : sync === 'BLACK_BOX' ? 'OPERATIONAL (OFFLINE)' : 'OFFLINE';

  return (
    <>
      <Head>
        <title>{cityData.code} ORIENTATION - UNMAPPED OS</title>
      </Head>

      {/* HUD Overlay */}
      <div className="hud-overlay" />

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6 animate-boot">
          <div className="flex items-center justify-between">
            <Link href="/cities">
              <button className="btn-tactical-ghost text-tactical-sm">← ALL CITIES</button>
            </Link>
            <div className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-widest">
              ORIENTATION
            </div>
            <Link href="/map/" aria-disabled>
              <div className="w-24" />
            </Link>
          </div>

          <div className="hud-card neon-border-top">
            <div className="space-y-3 font-mono text-tactical-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ops-night-muted">{c('city.header.city')}:</span>
                <span className="text-ops-night-text">{displayName.toUpperCase()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ops-night-muted">{c('city.header.localTime')}:</span>
                <span className="text-ops-night-text">{formatHHMM(now)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ops-night-muted">{c('city.header.weather')}:</span>
                <span className="text-ops-night-text">{weatherLine}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ops-night-muted">{c('city.header.status')}:</span>
                <span className="text-ops-night-text">{statusLine}</span>
              </div>
            </div>
          </div>

          {pack && tpi && !loading && <TouristPressureGauge tpi={tpi} />}

          {!pack && (
            <div className="hud-card">
              <div className="hud-card-header">LOCAL INTELLIGENCE</div>
              <div className="space-y-4">
                <div className="font-mono text-tactical-base text-ops-night-text/90">
                  ONE DOWNLOAD ENABLES OFFLINE OPERATIONS.
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloading || !isOnline()}
                  className="btn-tactical-primary w-full py-4 text-tactical-base disabled:opacity-60"
                >
                  {downloading ? 'ACQUIRING...' : 'ACQUIRE LOCAL INTELLIGENCE'}
                </button>
                {!isOnline() && (
                  <div className="font-mono text-tactical-xs text-ops-neon-amber/90">
                    CONNECT ONCE TO ACQUIRE.
                  </div>
                )}
                {downloadStage && (
                  <div className="font-mono text-tactical-xs text-ops-neon-green terminal-flicker">
                    &gt; {downloadStage}
                  </div>
                )}
              </div>
            </div>
          )}

          {pack && startHere && (
            <div className="hud-card neon-border-top">
              <div className="hud-card-header">{c('startHere.title')}</div>
              <div className="space-y-3 font-mono text-tactical-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-ops-night-muted">{c('startHere.zone')}:</span>
                  <span className="text-ops-night-text">{startHere.zone.zone_id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ops-night-muted">{c('startHere.anchor')}:</span>
                  <span className="text-ops-night-text">
                    {startHere.zone.selected_anchor.name.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ops-night-muted">{c('startHere.why')}:</span>
                  <span className="text-ops-night-text">{startHere.why}</span>
                </div>

                <button
                  onClick={() => {
                    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
                    openGoogleMaps(
                      startHere.zone.selected_anchor.lat,
                      startHere.zone.selected_anchor.lon
                    );
                  }}
                  className="btn-tactical-primary w-full py-4 text-tactical-base"
                >
                  {c('startHere.navigate')}
                </button>

                <Link href={`/map/${encodeURIComponent(cityKey)}`}>
                  <button className="btn-tactical-ghost w-full py-3 text-tactical-xs">
                    OPEN TACTICAL MAP
                  </button>
                </Link>
              </div>
            </div>
          )}

          <div className="font-mono text-[10px] text-ops-night-muted">
            NO MAP. NO BUSINESSES. INTEL FIRST.
          </div>
        </div>
      </main>
    </>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}
