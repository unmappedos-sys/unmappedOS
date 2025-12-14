import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { CityPack, Zone } from '@unmapped/lib';
import { downloadCityPack, getCityPack } from '@/lib/cityPack';
import { copyToClipboard, isOnline, vibrateDevice, VIBRATION_PATTERNS } from '@/lib/deviceAPI';
import { computeTouristPressureIndex } from '@/lib/intel/touristPressure';

export default function ProofScreen() {
  const router = useRouter();
  const city = typeof router.query.city === 'string' ? router.query.city : null;
  const zoneId = typeof router.query.zone === 'string' ? router.query.zone : null;

  const [pack, setPack] = useState<CityPack | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!city || !zoneId) return;

      setLoading(true);
      setError(null);

      let p = await getCityPack(city);
      if (!p && isOnline()) {
        try {
          await downloadCityPack(city);
          p = await getCityPack(city);
        } catch {
          // ignore and fall through
        }
      }

      if (!p) {
        setError(
          isOnline()
            ? 'CITY PACK NOT FOUND. OPEN A CITY ONCE TO CACHE IT.'
            : 'OFFLINE AND NO CACHED CITY PACK FOUND.'
        );
        setPack(null);
        setZone(null);
        setLoading(false);
        return;
      }

      const z = p.zones.find((x) => x.zone_id === zoneId) || null;
      if (!z) {
        setError('ZONE NOT FOUND IN PACK.');
        setPack(p);
        setZone(null);
        setLoading(false);
        return;
      }

      setPack(p);
      setZone(z);
      setLoading(false);
      vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
    };

    run();
  }, [city, zoneId]);

  const tpi = useMemo(() => {
    if (!pack || !zone) return null;
    return computeTouristPressureIndex(zone, pack.zones);
  }, [pack, zone]);

  const now = useMemo(() => new Date(), [zoneId, city]);

  const handleCopy = async () => {
    if (!pack || !zone || !tpi) return;

    const lines = [
      `UNMAPPED OS // PROOF SCREEN`,
      `${pack.city.toUpperCase()} // ${zone.zone_id}`,
      `LOCAL PRICE VERIFIED`,
      `TOURIST PRESSURE: ${tpi.status}`,
      `REASON: ${tpi.reason}`,
      `TIME: ${now.toISOString()}`,
    ];

    await copyToClipboard(lines.join('\n'));
    vibrateDevice(VIBRATION_PATTERNS.CONFIRM);
  };

  return (
    <>
      <Head>
        <title>PROOF SCREEN - UNMAPPED OS</title>
      </Head>

      <div className="min-h-screen bg-ops-night-bg relative">
        <div className="hud-overlay" />
        <div className="scan-line" />

        <div className="max-w-xl mx-auto px-6 py-10">
          <div className="hud-card neon-border-top">
            <div className="hud-card-header">PROOF SCREEN</div>

            {loading && (
              <div className="font-mono text-tactical-base text-ops-neon-cyan">LOADING...</div>
            )}

            {!loading && error && (
              <div className="font-mono text-tactical-base text-ops-critical">{error}</div>
            )}

            {!loading && !error && pack && zone && tpi && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-tactical text-tactical-lg text-ops-neon-green uppercase tracking-widest">
                    {pack.city.toUpperCase()}
                  </div>
                  <div className="font-mono text-tactical-xs text-ops-night-muted">
                    {zone.zone_id}
                  </div>
                </div>

                <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
                  <div className="font-tactical text-tactical-base text-ops-neon-green uppercase tracking-wider">
                    LOCAL PRICE VERIFIED
                  </div>
                  <div className="mt-2 space-y-1 font-mono text-tactical-xs">
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">TOURIST PRESSURE:</span>
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
                      <span className="text-ops-night-muted">REASON:</span>
                      <span className="text-ops-night-text">{tpi.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ops-night-muted">STAMP:</span>
                      <span className="text-ops-night-text">{now.toISOString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.back()}
                    className="btn-tactical flex-1 py-3 text-tactical-xs"
                  >
                    CLOSE
                  </button>
                  <button
                    onClick={handleCopy}
                    className="btn-tactical-primary flex-1 py-3 text-tactical-xs"
                  >
                    COPY
                  </button>
                </div>

                <p className="font-mono text-[10px] text-ops-night-muted">
                  No map. No business. Share the status, not the place.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
