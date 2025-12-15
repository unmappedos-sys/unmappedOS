/**
 * UNMAPPED OS - Tactical Crisis Mode
 *
 * Full-screen emergency interface.
 * Triggered by:
 * - Button
 * - Shake gesture
 * - Battery critical
 *
 * Shows:
 * - Emergency contacts
 * - Hospital address
 * - Police number
 * - "Show to driver" phrases
 *
 * Minimal interaction, large text.
 * All data from local JSON - works offline.
 */

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CrisisConfig } from './types';

interface TacticalCrisisModeProps {
  active: boolean;
  trigger?: 'MANUAL' | 'SHAKE' | 'BATTERY';
  config: CrisisConfig;
  onExit: () => void;
  onCall: (type: 'police' | 'ambulance' | 'embassy') => void;
}

function TacticalCrisisMode({
  active,
  trigger = 'MANUAL',
  config,
  onExit,
  onCall,
}: TacticalCrisisModeProps) {
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [showPhrases, setShowPhrases] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (active) {
      setSelectedPhrase(null);
      setShowPhrases(false);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black text-white font-mono overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-red-900/50 border-b border-red-500 p-4">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-3xl"
                >
                  🚨
                </motion.span>
                <div>
                  <h1 className="text-xl font-bold tracking-widest text-red-400">CRISIS MODE</h1>
                  <p className="text-xs text-red-300/70">{trigger.toUpperCase()} ACTIVATION</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onExit}
                className="px-4 py-2 border border-white/50 text-sm hover:bg-white/10 transition-colors"
              >
                EXIT
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-lg mx-auto p-4 space-y-6">
            {/* Emergency Contacts */}
            <section>
              <h2 className="text-sm font-bold tracking-widest text-stone-400 mb-3">
                EMERGENCY CONTACTS
              </h2>
              <div className="space-y-3">
                <EmergencyButton
                  icon="👮"
                  label="POLICE"
                  number={config.police}
                  color="red"
                  onClick={() => onCall('police')}
                />
                <EmergencyButton
                  icon="🚑"
                  label="AMBULANCE"
                  number={config.ambulance}
                  color="amber"
                  onClick={() => onCall('ambulance')}
                />
                {config.embassy && (
                  <EmergencyButton
                    icon="🏛️"
                    label="EMBASSY"
                    number={config.embassy}
                    color="blue"
                    onClick={() => onCall('embassy')}
                  />
                )}
              </div>
            </section>

            {/* Hospital */}
            {config.hospital && (
              <section>
                <h2 className="text-sm font-bold tracking-widest text-stone-400 mb-3">
                  NEAREST HOSPITAL
                </h2>
                <div className="p-4 bg-stone-900 border border-stone-700 rounded-lg">
                  <p className="font-bold text-lg">{config.hospital.name}</p>
                  <p className="text-sm text-stone-400 mt-1">{config.hospital.address}</p>
                  <p className="text-xs text-emerald-400 mt-2">SHOW ADDRESS TO DRIVER</p>
                </div>
              </section>
            )}

            {/* Safe Phrases */}
            <section>
              <button
                onClick={() => setShowPhrases(!showPhrases)}
                className="w-full flex items-center justify-between text-sm font-bold tracking-widest text-stone-400 mb-3"
              >
                <span>SAFE PHRASES</span>
                <span className="text-xs">{showPhrases ? '▼' : '▶'}</span>
              </button>

              <AnimatePresence>
                {showPhrases && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {config.safePhrases.map((phrase) => (
                      <button
                        key={phrase.id}
                        onClick={() =>
                          setSelectedPhrase(selectedPhrase === phrase.id ? null : phrase.id)
                        }
                        className={`
                          w-full text-left p-4 rounded-lg transition-colors
                          ${
                            selectedPhrase === phrase.id
                              ? 'bg-amber-900/50 border-2 border-amber-500'
                              : 'bg-stone-900 border border-stone-700 hover:border-stone-500'
                          }
                        `}
                      >
                        <p className="text-xs text-stone-500 mb-1">{phrase.context}</p>
                        <p className="text-xl font-bold mb-2">{phrase.local}</p>
                        <p className="text-sm text-stone-400">{phrase.english}</p>
                        {selectedPhrase === phrase.id && (
                          <p className="text-xs text-amber-400 mt-2">SHOW TO DRIVER OR LOCAL</p>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Footer */}
            <div className="pt-6 text-center text-xs text-stone-600">
              ALL DATA STORED LOCALLY — WORKS OFFLINE
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface EmergencyButtonProps {
  icon: string;
  label: string;
  number: string;
  color: 'red' | 'amber' | 'blue';
  onClick: () => void;
}

function EmergencyButton({ icon, label, number, color, onClick }: EmergencyButtonProps) {
  const colorStyles = {
    red: 'border-red-500 bg-red-900/30 hover:bg-red-900/50',
    amber: 'border-amber-500 bg-amber-900/30 hover:bg-amber-900/50',
    blue: 'border-blue-500 bg-blue-900/30 hover:bg-blue-900/50',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full flex items-center justify-between
        p-4 rounded-lg border-2 transition-colors
        ${colorStyles[color]}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <span className="font-bold tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold">{number}</span>
    </motion.button>
  );
}

export default memo(TacticalCrisisMode);
