/**
 * Crisis Mode UI Component
 * 
 * Full-screen emergency interface with:
 * - Emergency contacts
 * - Safe phrases
 * - Minimal battery usage design
 */

import { useState } from 'react';
import { useCrisisMode } from '@/hooks/useCrisisMode';
import { SafePhrase } from '@/lib/crisisMode';

interface CrisisModeUIProps {
  city: string;
  userId?: string;
  onExit?: () => void;
}

export function CrisisModeUI({ city, userId, onExit }: CrisisModeUIProps) {
  const {
    isActive,
    config,
    trigger,
    activatedAt,
    deactivate,
    callEmergency,
  } = useCrisisMode({ city, userId });

  const [selectedPhrase, setSelectedPhrase] = useState<SafePhrase | null>(null);
  const [showPhrases, setShowPhrases] = useState(false);

  const handleExit = () => {
    deactivate();
    onExit?.();
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-ops-neon-green font-mono">
      {/* Header */}
      <div className="bg-ops-neon-red/20 border-b border-ops-neon-red p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <h1 className="text-xl font-bold tracking-wider">CRISIS MODE</h1>
              <p className="text-xs text-ops-neon-red">
                ACTIVATED: {trigger?.toUpperCase()} // {activatedAt?.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 border border-ops-neon-green text-sm hover:bg-ops-neon-green/20 transition-colors"
          >
            EXIT CRISIS
          </button>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold tracking-wider border-b border-ops-neon-green/30 pb-2">
          EMERGENCY CONTACTS
        </h2>

        <div className="grid gap-3">
          {/* Police */}
          <button
            onClick={() => callEmergency('police')}
            className="flex items-center justify-between p-4 bg-ops-neon-red/10 border border-ops-neon-red hover:bg-ops-neon-red/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👮</span>
              <div className="text-left">
                <p className="font-bold">POLICE</p>
                <p className="text-sm text-ops-night-text-dim">Emergency services</p>
              </div>
            </div>
            <span className="text-2xl font-bold">{config.emergency_police}</span>
          </button>

          {/* Ambulance */}
          <button
            onClick={() => callEmergency('ambulance')}
            className="flex items-center justify-between p-4 bg-ops-neon-amber/10 border border-ops-neon-amber hover:bg-ops-neon-amber/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚑</span>
              <div className="text-left">
                <p className="font-bold">AMBULANCE</p>
                <p className="text-sm text-ops-night-text-dim">Medical emergency</p>
              </div>
            </div>
            <span className="text-2xl font-bold">{config.emergency_ambulance}</span>
          </button>

          {/* Embassy */}
          {config.embassy_phone && (
            <button
              onClick={() => callEmergency('embassy')}
              className="flex items-center justify-between p-4 bg-ops-neon-blue/10 border border-ops-neon-blue hover:bg-ops-neon-blue/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏛️</span>
                <div className="text-left">
                  <p className="font-bold">EMBASSY</p>
                  <p className="text-sm text-ops-night-text-dim">Consular assistance</p>
                </div>
              </div>
              <span className="text-lg font-bold">{config.embassy_phone}</span>
            </button>
          )}
        </div>
      </div>

      {/* Safe Phrases */}
      <div className="p-4 space-y-4">
        <button
          onClick={() => setShowPhrases(!showPhrases)}
          className="w-full flex items-center justify-between text-lg font-bold tracking-wider border-b border-ops-neon-green/30 pb-2"
        >
          <span>SAFE PHRASES</span>
          <span>{showPhrases ? '▼' : '▶'}</span>
        </button>

        {showPhrases && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {config.safe_phrases.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => setSelectedPhrase(phrase)}
                className={`w-full text-left p-3 border transition-colors ${
                  selectedPhrase?.id === phrase.id
                    ? 'border-ops-neon-green bg-ops-neon-green/10'
                    : 'border-ops-neon-green/30 hover:border-ops-neon-green/50'
                }`}
              >
                <p className="text-sm text-ops-night-text-dim">{phrase.situation}</p>
                <p className="font-bold">{phrase.phrase_english}</p>
              </button>
            ))}
          </div>
        )}

        {/* Selected Phrase Display */}
        {selectedPhrase && (
          <div className="mt-4 p-4 bg-ops-neon-green/10 border border-ops-neon-green">
            <p className="text-xs text-ops-night-text-dim mb-2">
              {selectedPhrase.situation.toUpperCase()}
            </p>
            <p className="text-3xl font-bold mb-2">{selectedPhrase.phrase_local}</p>
            <p className="text-lg text-ops-neon-amber">{selectedPhrase.phrase_romanized}</p>
            <p className="text-sm text-ops-night-text-dim mt-2">
              {selectedPhrase.phrase_english}
            </p>
          </div>
        )}
      </div>

      {/* Power Save Notice */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-ops-neon-green/30">
        <div className="flex items-center justify-between text-xs text-ops-night-text-dim">
          <span>🔋 POWER SAVE MODE ACTIVE</span>
          <span>TAP PHRASE TO ENLARGE</span>
        </div>
      </div>
    </div>
  );
}

export default CrisisModeUI;
