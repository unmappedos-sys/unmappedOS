import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { downloadCityPack } from '@/lib/cityPack';

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
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadStage, setDownloadStage] = useState('');

  const cityData = city && typeof city === 'string' ? CITIES[city as keyof typeof CITIES] : null;

  useEffect(() => {
    if (city && !cityData) {
      router.push('/cities');
    }
  }, [city, cityData, router]);

  const handleDownload = async () => {
    if (!city || typeof city !== 'string') return;

    setDownloading(true);
    setProgress(0);

    try {
      const steps = [
        { msg: 'ESTABLISHING SECURE LINK...', duration: 400 },
        { msg: 'REQUESTING BLACK BOX DATA...', duration: 500 },
        { msg: 'DOWNLOADING ZONE GEOMETRIES...', duration: 600 },
        { msg: 'PARSING ANCHOR COORDINATES...', duration: 500 },
        { msg: 'CACHING PRICE INTEL...', duration: 400 },
        { msg: 'LOADING TACTICAL CHEAT SHEETS...', duration: 400 },
        { msg: 'ENCRYPTING PAYLOAD...', duration: 500 },
        { msg: 'WRITING TO SECURE STORAGE...', duration: 600 },
        { msg: 'VERIFICATION COMPLETE', duration: 300 },
      ];

      for (let i = 0; i < steps.length; i++) {
        setDownloadStage(steps[i].msg);
        await new Promise((resolve) => setTimeout(resolve, steps[i].duration));
        setProgress(((i + 1) / steps.length) * 100);
      }

      await downloadCityPack(city);
      setDownloadComplete(true);

      setTimeout(() => {
        router.push(`/map/${city}`);
      }, 1200);
    } catch (error) {
      console.error('Pack download failed:', error);
      alert('BLACK BOX ACQUISITION FAILED. Check console for details.');
      setDownloading(false);
    }
  };

  if (!cityData) return null;

  return (
    <>
      <Head>
        <title>{cityData.code} MISSION BRIEFING - UNMAPPED OS</title>
      </Head>

      {/* HUD Overlay */}
      <div className="hud-overlay" />

      {/* Diagnostic Panel */}
      <div className="diagnostic-panel top-4 right-4">
        <div className="space-y-1">
          <div
            className={`status-indicator ${downloadComplete ? 'active' : downloading ? 'warning' : 'ghost'}`}
          >
            BLACK BOX
          </div>
          <div className="status-indicator active">NETWORK</div>
          <div className="font-mono text-tactical-xs text-ops-night-muted mt-2">
            {cityData.code} THEATER
          </div>
        </div>
      </div>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-boot">
          {/* Header Navigation */}
          <div className="flex items-center justify-between">
            <Link href="/cities">
              <button className="btn-tactical-ghost text-tactical-sm">← ALL CITIES</button>
            </Link>
            <h1 className="font-tactical text-tactical-lg text-ops-neon-cyan uppercase tracking-widest">
              MISSION BRIEFING
            </h1>
            <Link href="/operative">
              <button className="btn-tactical-ghost text-tactical-sm">OPERATIVE</button>
            </Link>
          </div>

          {/* City Intel Card */}
          <div className="hud-card neon-border-top animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <h2 className="font-tactical text-5xl text-ops-neon-green uppercase tracking-widest">
                      {cityData.name}
                    </h2>
                    <span className="font-tactical text-tactical-2xl text-ops-neon-cyan">
                      {cityData.code}
                    </span>
                  </div>
                  <p className="font-mono text-tactical-base text-ops-night-muted uppercase">
                    {cityData.country}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 border ${
                    cityData.threat === 'LOW'
                      ? 'border-ops-active/50 text-ops-active'
                      : cityData.threat === 'MODERATE'
                        ? 'border-ops-warning/50 text-ops-warning'
                        : 'border-ops-critical/50 text-ops-critical'
                  } font-tactical text-tactical-xs uppercase tracking-wider`}
                >
                  THREAT: {cityData.threat}
                </div>
              </div>

              <div className="border-t border-ops-neon-green/20 pt-4">
                <p className="font-mono text-tactical-base text-ops-night-text/90 leading-relaxed">
                  {cityData.description}
                </p>
                <p className="font-tactical text-tactical-xs text-ops-night-muted mt-2 uppercase tracking-wider">
                  Classification: {cityData.classification}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                    Zones
                  </p>
                  <p className="font-tactical text-3xl text-ops-neon-green mt-1">
                    {cityData.zones}
                  </p>
                </div>
                <div className="bg-ops-night-surface/50 border border-ops-neon-cyan/20 p-4">
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                    Status
                  </p>
                  <p className="font-tactical text-tactical-sm text-ops-neon-cyan mt-2 uppercase">
                    ACTIVE
                  </p>
                </div>
                <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                    Pack Size
                  </p>
                  <p className="font-mono text-tactical-base text-ops-night-text mt-2">2.4 MB</p>
                </div>
                <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                    Updated
                  </p>
                  <p className="font-mono text-tactical-base text-ops-night-text mt-2">Dec 12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Protocols */}
          <div className="hud-card animate-slide-in">
            <div className="hud-card-header">EMERGENCY PROTOCOLS</div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                  Police
                </p>
                <p className="font-mono text-tactical-lg text-ops-neon-cyan mt-2">
                  {cityData.emergency.police}
                </p>
              </div>
              <div>
                <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                  Ambulance
                </p>
                <p className="font-mono text-tactical-lg text-ops-neon-cyan mt-2">
                  {cityData.emergency.ambulance}
                </p>
              </div>
              <div>
                <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                  Embassy
                </p>
                <p className="font-mono text-tactical-sm text-ops-neon-cyan mt-2">
                  {cityData.emergency.embassy}
                </p>
              </div>
            </div>
          </div>

          {/* Download Black Box Section */}
          <div className="hud-card neon-border-top animate-fade-in">
            {!downloading && !downloadComplete && (
              <>
                <div className="hud-card-header">ACQUIRE BLACK BOX INTEL</div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="font-mono text-tactical-base text-ops-night-text/90 leading-relaxed">
                      Encrypted intelligence bundle contains zone geometries, anchor coordinates,
                      price data, and tactical cheat sheets. Enables full ghost-mode operations
                      without network connectivity.
                    </p>
                    <div className="flex items-center gap-4 font-mono text-tactical-xs text-ops-night-muted">
                      <span>• OFFLINE CAPABLE</span>
                      <span>• ENCRYPTED</span>
                      <span>• AUTO-SYNC</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="btn-tactical-primary w-full py-4 text-tactical-base"
                  >
                    INITIATE BLACK BOX DOWNLOAD
                  </button>
                </div>
              </>
            )}

            {downloading && (
              <div className="space-y-6">
                <div className="hud-card-header terminal-flicker">DOWNLOADING BLACK BOX</div>
                <div className="font-mono text-tactical-sm text-ops-neon-green space-y-2">
                  <p className="boot-text">&gt; {downloadStage}</p>
                  <p className="boot-text">&gt; PROGRESS: {progress.toFixed(0)}%</p>
                </div>
                <div className="w-full bg-ops-night-surface border border-ops-neon-green/30 h-3 relative overflow-hidden">
                  <div
                    className="bg-ops-neon-green h-full transition-all duration-300 shadow-neon"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {downloadComplete && (
              <div className="space-y-4">
                <div className="font-tactical text-center space-y-3">
                  <p className="text-4xl text-ops-active animate-pulse-neon">
                    ✓ BLACK BOX ACQUIRED
                  </p>
                  <p className="font-mono text-tactical-sm text-ops-neon-cyan terminal-flicker">
                    &gt; LOADING TACTICAL DISPLAY...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Intel Footer */}
          <div className="font-mono text-tactical-xs text-ops-night-muted space-y-2 animate-fade-in">
            <p>• BLACK BOXES UPDATED WEEKLY VIA AUTOMATED PIPELINE</p>
            <p>• INTEL SOURCES: OpenStreetMap, OpenTripMap, Wikidata</p>
            <p>• GHOST MODE: Full functionality without connectivity</p>
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
