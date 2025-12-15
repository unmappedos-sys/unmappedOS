import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSelector from '@/components/LanguageSelector';
import { getAllCityPackRecords, normalizeCityKey } from '@/lib/cityPack';

interface CityInfo {
  id: string;
  name: string;
  country: string;
  flag: string;
  zones: number;
  status: 'available' | 'coming-soon';
  description: string;
}

const cities: CityInfo[] = [
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    flag: '🇹🇭',
    zones: 12,
    status: 'available',
    description: 'Chaotic energy, street food paradise, temple sanctuaries',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    zones: 15,
    status: 'available',
    description: 'Neon dystopia, precision chaos, future-shock districts',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    zones: 0,
    status: 'available',
    description: 'Garden city-state, hawker centers, vertical urbanism',
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    country: 'Hong Kong',
    flag: '🇭🇰',
    zones: 0,
    status: 'available',
    description: 'Vertical density, rooftop culture, dim sum districts',
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    flag: '🇰🇷',
    zones: 0,
    status: 'available',
    description: 'Tech megalopolis, night markets, digital frontier',
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    flag: '🇮🇩',
    zones: 0,
    status: 'available',
    description: 'Beach corridors, temple routes, island logistics',
  },
  {
    id: 'kualalumpur',
    name: 'Kuala Lumpur',
    country: 'Malaysia',
    flag: '🇲🇾',
    zones: 0,
    status: 'available',
    description: 'Skyline hubs, night food lanes, transit interchanges',
  },
  {
    id: 'hanoi',
    name: 'Hanoi',
    country: 'Vietnam',
    flag: '🇻🇳',
    zones: 0,
    status: 'available',
    description: 'Old quarter mazes, lake loops, street vitality bands',
  },
  {
    id: 'hochiminh',
    name: 'Ho Chi Minh City',
    country: 'Vietnam',
    flag: '🇻🇳',
    zones: 0,
    status: 'available',
    description: 'Motorbike flow, market grids, late-night corridors',
  },
  {
    id: 'taipei',
    name: 'Taipei',
    country: 'Taiwan',
    flag: '🇹🇼',
    zones: 0,
    status: 'available',
    description: 'Night markets, temple trails, mountain escapes',
  },
];

export default function Cities() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveCityQuery, setLiveCityQuery] = useState('');
  const [bootStage, setBootStage] = useState(0);

  const [packMetaByCity, setPackMetaByCity] = useState<
    Record<
      string,
      {
        zones: number;
        version: number;
        generatedAt: string;
        downloadedAt: string;
      }
    >
  >({});

  const refreshPackMeta = useCallback(async () => {
    const records = await getAllCityPackRecords();
    const next: Record<
      string,
      { zones: number; version: number; generatedAt: string; downloadedAt: string }
    > = {};

    for (const rec of records) {
      if (!rec?.city || !rec?.pack) continue;
      next[rec.city] = {
        zones: Array.isArray(rec.pack.zones) ? rec.pack.zones.length : 0,
        version: typeof rec.pack.version === 'number' ? rec.pack.version : 0,
        generatedAt: String(rec.pack.generated_at || ''),
        downloadedAt: String(rec.downloadedAt || ''),
      };
    }

    setPackMetaByCity(next);
  }, []);

  useEffect(() => {
    const stages = [
      { delay: 200, stage: 1 },
      { delay: 400, stage: 2 },
      { delay: 600, stage: 3 },
    ];

    stages.forEach(({ delay, stage }) => {
      setTimeout(() => setBootStage(stage), delay);
    });
  }, []);

  useEffect(() => {
    refreshPackMeta();

    const onFocus = () => refreshPackMeta();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshPackMeta();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('unmapped-city-packs');
        channel.onmessage = () => refreshPackMeta();
      }
    } catch {
      channel = null;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshPackMeta();
    }, 2500);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
      if (channel) channel.close();
    };
  }, [refreshPackMeta]);

  const filteredCities = useMemo(
    () =>
      cities.filter(
        (city) =>
          city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const availableCities = useMemo(
    () => filteredCities.filter((c) => c.status === 'available'),
    [filteredCities]
  );
  const comingSoonCities = useMemo(
    () => filteredCities.filter((c) => c.status === 'coming-soon'),
    [filteredCities]
  );

  return (
    <>
      <Head>
        <title>SELECT THEATER OF OPERATIONS - UNMAPPED OS</title>
      </Head>

      {/* HUD Overlay */}
      <div className="hud-overlay" />

      {/* Scan Line Effect */}
      <div className="scan-line" />

      {/* Language Selector - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <LanguageSelector />
      </div>

      {/* Diagnostic Panel */}
      <div className="diagnostic-panel top-4 right-4">
        <div className="space-y-1">
          {user && (
            <div className="font-mono text-tactical-xs text-ops-neon-green mb-2">
              OPERATIVE: {user.email || 'UNKNOWN'}
            </div>
          )}
          <div className={`status-indicator ${bootStage >= 2 ? 'active' : 'ghost'}`}>
            {t.gpsModule.toUpperCase()}
          </div>
          <div className={`status-indicator ${bootStage >= 3 ? 'active' : 'ghost'}`}>
            CITY DATABASE
          </div>
        </div>
      </div>

      <main className="min-h-screen p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 animate-boot">
            <Link href="/">
              <div className="glitch-text inline-block cursor-pointer" data-text="UNMAPPED OS">
                <h1 className="font-tactical text-4xl md:text-6xl text-ops-neon-green tracking-widest">
                  UNMAPPED OS
                </h1>
              </div>
            </Link>
            <h2 className="font-tactical text-tactical-xl text-ops-neon-cyan uppercase tracking-widest">
              SELECT THEATER OF OPERATIONS
            </h2>
            <p className="font-mono text-tactical-sm text-ops-night-muted">
              &gt; CHOOSE YOUR DEPLOYMENT ZONE
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto animate-slide-in">
            <div className="space-y-3">
              <div className="hud-card">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cities..."
                    className="input-tactical flex-1"
                  />
                </div>
              </div>

              <div className="hud-card">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📡</span>
                  <input
                    type="text"
                    value={liveCityQuery}
                    onChange={(e) => setLiveCityQuery(e.target.value)}
                    placeholder="Live city (anywhere) e.g., Bangalore"
                    className="input-tactical flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const key = normalizeCityKey(liveCityQuery);
                      if (!key) return;
                      router.push(`/city/${key}`);
                    }}
                    className="btn-tactical-primary px-4 py-2 text-tactical-xs whitespace-nowrap"
                  >
                    DEPLOY
                  </button>
                </div>
                <div className="mt-2 font-mono text-[10px] text-ops-night-muted">
                  Live bootstrap will generate a city pack on-demand and cache it locally.
                </div>
              </div>
            </div>
          </div>

          {/* Available Cities */}
          {availableCities.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-[2px] flex-1 bg-ops-neon-green/30" />
                <h3 className="font-tactical text-tactical-sm text-ops-neon-green uppercase tracking-wider">
                  ACTIVE OPERATIONS
                </h3>
                <div className="h-[2px] flex-1 bg-ops-neon-green/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCities.map((city) => (
                  <Link key={city.id} href={`/city/${city.id}`}>
                    <div className="hud-card holo-border interactive-card cursor-pointer group">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-3xl">{city.flag}</span>
                            <h3 className="font-tactical text-tactical-lg text-ops-neon-cyan group-hover:text-ops-neon-green transition-colors">
                              {city.name}
                            </h3>
                          </div>
                          <p className="font-mono text-tactical-xs text-ops-night-muted">
                            {city.country}
                          </p>
                        </div>
                        <div className="status-indicator active">{t.active.toUpperCase()}</div>
                      </div>

                      <p className="text-tactical-sm text-ops-night-text/80 mb-4 leading-relaxed">
                        {city.description}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-ops-neon-green/20">
                        <div className="font-mono text-tactical-xs text-ops-neon-green">
                          {packMetaByCity[normalizeCityKey(city.id)]?.zones ?? '—'} {t.zonesLoaded}
                        </div>
                        <div className="font-tactical text-tactical-xs text-ops-neon-cyan group-hover:text-ops-neon-green transition-colors">
                          {t.deploy.toUpperCase()} →
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Coming Soon Cities */}
          {comingSoonCities.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-[2px] flex-1 bg-ops-night-border/30" />
                <h3 className="font-tactical text-tactical-sm text-ops-night-muted uppercase tracking-wider">
                  PLANNED OPERATIONS
                </h3>
                <div className="h-[2px] flex-1 bg-ops-night-border/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comingSoonCities.map((city) => (
                  <div key={city.id} className="hud-card opacity-50 cursor-not-allowed">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-3xl grayscale">{city.flag}</span>
                          <h3 className="font-tactical text-tactical-lg text-ops-night-text">
                            {city.name}
                          </h3>
                        </div>
                        <p className="font-mono text-tactical-xs text-ops-night-muted">
                          {city.country}
                        </p>
                      </div>
                      <div className="status-indicator ghost">SOON</div>
                    </div>

                    <p className="text-tactical-sm text-ops-night-text/60 mb-4 leading-relaxed">
                      {city.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-ops-night-border/20">
                      <div className="font-mono text-tactical-xs text-ops-night-muted">
                        IN DEVELOPMENT
                      </div>
                      <div className="font-tactical text-tactical-xs text-ops-night-muted">
                        STANDBY
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredCities.length === 0 && (
            <div className="hud-card max-w-2xl mx-auto text-center animate-fade-in">
              <div className="space-y-4">
                <div className="text-6xl opacity-20">🔍</div>
                <h3 className="font-tactical text-tactical-lg text-ops-night-muted uppercase">
                  NO CITIES FOUND
                </h3>
                <p className="font-mono text-tactical-sm text-ops-night-text/60">
                  Theater of operations not found. Try a different search query.
                </p>
                {searchQuery.trim().length > 0 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        const key = normalizeCityKey(searchQuery);
                        if (!key) return;
                        router.push(`/city/${key}`);
                      }}
                      className="btn-tactical-primary"
                    >
                      DEPLOY LIVE CITY
                    </button>
                    <button onClick={() => setSearchQuery('')} className="btn-tactical-ghost">
                      CLEAR SEARCH
                    </button>
                  </div>
                )}

                {searchQuery.trim().length === 0 && (
                  <button onClick={() => setSearchQuery('')} className="btn-tactical-ghost">
                    CLEAR SEARCH
                  </button>
                )}

                <div className="font-mono text-[10px] text-ops-night-muted">
                  Tip: try “bengaluru” or “bangalore” — live mode will bootstrap it.
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-center gap-4 pt-8 animate-fade-in">
            {!user ? (
              <Link href="/login">
                <button className="btn-tactical-primary">{t.signIn.toUpperCase()}</button>
              </Link>
            ) : (
              <>
                <Link href="/operative">
                  <button className="btn-tactical-ghost">{t.operativeProfile.toUpperCase()}</button>
                </Link>
                <Link href="/login?reason=SIGNED_OUT">
                  <button className="btn-tactical-ghost">{t.signOut.toUpperCase()}</button>
                </Link>
              </>
            )}
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
