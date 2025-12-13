/**
 * HUD Whisper Display Component
 * 
 * Displays mission whispers with tactical styling.
 */

import { useEffect, useState } from 'react';
import { Whisper, formatWhisperForHUD } from '@/lib/whisperEngine';

interface WhisperDisplayProps {
  whispers: Whisper[];
  autoRotate?: boolean;
  rotateIntervalMs?: number;
  maxVisible?: number;
}

export function WhisperDisplay({
  whispers,
  autoRotate = true,
  rotateIntervalMs = 5000,
  maxVisible = 1,
}: WhisperDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoRotate || whispers.length <= maxVisible) return;

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);

      // Change whisper and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % whispers.length);
        setIsVisible(true);
      }, 300);
    }, rotateIntervalMs);

    return () => clearInterval(interval);
  }, [autoRotate, rotateIntervalMs, whispers.length, maxVisible]);

  if (whispers.length === 0) return null;

  const visibleWhispers = whispers.slice(currentIndex, currentIndex + maxVisible);

  return (
    <div className="space-y-2">
      {visibleWhispers.map((whisper, index) => (
        <div
          key={whisper.id}
          className={`
            transition-all duration-300
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
          `}
        >
          <WhisperCard whisper={whisper} />
        </div>
      ))}

      {/* Pagination dots */}
      {whispers.length > maxVisible && (
        <div className="flex justify-center gap-1 mt-2">
          {whispers.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsVisible(true);
                }, 200);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? 'bg-ops-neon-green'
                  : 'bg-ops-neon-green/30 hover:bg-ops-neon-green/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WhisperCardProps {
  whisper: Whisper;
}

function WhisperCard({ whisper }: WhisperCardProps) {
  const typeColors: Record<Whisper['type'], string> = {
    intel: 'border-ops-neon-cyan text-ops-neon-cyan',
    price: 'border-ops-neon-amber text-ops-neon-amber',
    safety: 'border-ops-neon-red text-ops-neon-red',
    timing: 'border-ops-neon-purple text-ops-neon-purple',
    local: 'border-ops-neon-green text-ops-neon-green',
  };

  const colors = typeColors[whisper.type] || typeColors.intel;

  return (
    <div
      className={`
        px-3 py-2 
        bg-ops-night-surface/80 backdrop-blur-sm
        border-l-2 ${colors}
        font-mono text-xs
        animate-pulse-subtle
      `}
    >
      <p className="text-ops-night-text tracking-wide">
        {formatWhisperForHUD(whisper)}
      </p>
      {whisper.confidence < 0.7 && (
        <p className="text-ops-night-text-dim text-[10px] mt-1">
          CONFIDENCE: {Math.round(whisper.confidence * 100)}%
        </p>
      )}
    </div>
  );
}

export default WhisperDisplay;
