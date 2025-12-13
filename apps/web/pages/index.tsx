import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import Head from 'next/head';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [bootStage, setBootStage] = useState(0);
  const [showUI, setShowUI] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user && !loading) {
      router.push('/cities');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!mounted) return;
    
    // Boot sequence timing
    const stages = [
      { delay: 300, stage: 1 },
      { delay: 600, stage: 2 },
      { delay: 900, stage: 3 },
      { delay: 1200, stage: 4 },
      { delay: 1500, stage: 5 },
      { delay: 2000, stage: 6 },
    ];

    stages.forEach(({ delay, stage }) => {
      setTimeout(() => setBootStage(stage), delay);
    });

    setTimeout(() => setShowUI(true), 2200);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>UNMAPPED OS - TACTICAL URBAN INTELLIGENCE SYSTEM</title>
        <meta name="description" content="Military-grade offline intelligence for urban field operations" />
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
          <div className={`status-indicator ${bootStage >= 5 ? 'active' : 'ghost'}`}>
            {t.gpsModule.toUpperCase()}
          </div>
          <div className={`status-indicator ${bootStage >= 6 ? 'active' : 'ghost'}`}>
            {t.opsNetwork.toUpperCase()}
          </div>
          <div className="font-mono text-tactical-xs text-ops-night-muted mt-2">
            {new Date().toISOString().split('.')[0]}
          </div>
        </div>
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="max-w-5xl w-full space-y-12">
          
          {/* Title with glitch effect */}
          <div className="text-center space-y-6 animate-boot">
            <div className="glitch-text inline-block" data-text="UNMAPPED OS">
              <h1 className="font-tactical text-6xl md:text-8xl text-ops-neon-green tracking-widest">
                UNMAPPED OS
              </h1>
            </div>
            <div className="space-y-2">
              <p className="font-tactical text-tactical-lg text-ops-neon-cyan tracking-widest terminal-flicker">
                {t.tacticalDisplay.toUpperCase()}
              </p>
              <p className="font-mono text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                FIELD OPS • GHOST MODE CAPABLE • MISSION CRITICAL
              </p>
            </div>
          </div>

          {/* Boot Sequence Terminal */}
          <div className="hud-card animate-slide-in holo-border interactive-card">
            <div className="hud-card-header">{t.systemBooting.toUpperCase()}</div>
            <div className="font-mono text-tactical-sm space-y-2 text-ops-neon-green">
              {bootStage >= 1 && (
                <p className="boot-text">&gt; BOOTING UNMAPPED OS v1.0.0...</p>
              )}
              {bootStage >= 2 && (
                <p className="boot-text opacity-90">&gt; {t.loadingBlackBox.toUpperCase()}... <span className="text-ops-active">OK</span></p>
              )}
              {bootStage >= 3 && (
                <p className="boot-text opacity-90">&gt; CONNECTING TO FIELD NETWORK... <span className="text-ops-active">OK</span></p>
              )}
              {bootStage >= 4 && (
                <p className="boot-text opacity-90">&gt; {t.calibratingGPS.toUpperCase()}... <span className="text-ops-active">OK</span></p>
              )}
              {bootStage >= 5 && (
                <p className="boot-text opacity-90">&gt; DECRYPTING MISSION BLACK BOXES... <span className="text-ops-active">OK</span></p>
              )}
              {bootStage >= 6 && (
                <p className="boot-text text-ops-neon-cyan animate-pulse-neon">&gt; {t.systemOperational.toUpperCase()} • {t.allModulesGreen.toUpperCase()}</p>
              )}
            </div>
          </div>

          {/* Mission Brief - Features */}
          {showUI && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div className="hud-card neon-border-top interactive-card">
                <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase mb-3 neon-text">
                  {t.blackBox.toUpperCase()} INTEL
                </h3>
                <p className="text-tactical-base text-ops-night-text/80 leading-relaxed">
                  {t.cityPackAvailable}
                </p>
                <div className="mt-4 font-mono text-tactical-xs text-ops-night-muted">
                  {t.offlineCapable.toUpperCase()} • ENCRYPTED
                </div>
              </div>
              
              <div className="hud-card neon-border-top interactive-card">
                <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase mb-3 neon-text">
                  {t.anchorPoint.toUpperCase()} NAVIGATION
                </h3>
                <p className="text-tactical-base text-ops-night-text/80 leading-relaxed">
                  Military-grade waypoint system for zero-fail navigation
                </p>
                <div className="mt-4 font-mono text-tactical-xs text-ops-night-muted">
                  GPS INDEPENDENT • STABLE
                </div>
              </div>
              
              <div className="hud-card neon-border-top interactive-card">
                <h3 className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase mb-3 neon-text">
                  HAZARD INTEL
                </h3>
                <p className="text-tactical-base text-ops-night-text/80 leading-relaxed">
                  {t.reportHazard}: Real-time threat reports from field operatives
                </p>
                <div className="mt-4 font-mono text-tactical-xs text-ops-night-muted">
                  CROWDSOURCED • VERIFIED
                </div>
              </div>
            </div>
          )}

          {/* Mission Access CTA */}
          {showUI && (
            <div className="text-center space-y-6 animate-fade-in">
              <Link href="/api/auth/signin">
                <button className="btn-tactical-primary text-tactical-lg px-12 py-4 shadow-tactical-lg glow-pulse">
                  <span className="relative z-10">{t.signIn.toUpperCase()}</span>
                </button>
              </Link>
              <p className="font-mono text-tactical-xs text-ops-night-muted uppercase tracking-wider">
                {t.appDescription}
              </p>
              <div className="pt-4">
                <Link href="/cities">
                  <button className="btn-tactical-ghost text-tactical-sm px-8 py-3">
                    EXPLORE CITIES (Demo)
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Footer Intel */}
          {showUI && (
            <div className="text-center font-mono text-tactical-xs text-ops-night-muted space-y-2 pt-8 border-t border-ops-night-border animate-fade-in">
              <p>INTEL SOURCES: OpenStreetMap • OpenTripMap • Wikidata</p>
              <p className="text-ops-neon-green/50">
                PRIVACY-FIRST • OFFLINE-CAPABLE • COMMUNITY-DRIVEN
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
