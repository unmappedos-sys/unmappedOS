import { useEffect, useState } from 'react';

interface TerminalLoaderProps {
  stages: Array<{
    message: string;
    duration: number;
  }>;
  onComplete?: () => void;
  className?: string;
}

/**
 * TerminalLoader: Cinematic boot sequence component
 * 
 * UX Decision: Terminal-style loading creates authentic field software feel
 * and provides clear progress feedback without boring spinners.
 * 
 * Features:
 * - Timed stage progression
 * - Terminal flicker effects
 * - Automatic completion callback
 * - Customizable stages for different contexts
 * 
 * Usage:
 * <TerminalLoader 
 *   stages={[
 *     { message: 'INITIALIZING MODULES...', duration: 500 },
 *     { message: 'ENCRYPTION KEY GENERATED...', duration: 600 }
 *   ]}
 *   onComplete={() => setLoaded(true)}
 * />
 */
export default function TerminalLoader({ stages, onComplete, className = '' }: TerminalLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStage >= stages.length) {
      onComplete?.();
      return;
    }

    const stage = stages[currentStage];
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / (stage.duration / 50));
      });
    }, 50);

    const timer = setTimeout(() => {
      setProgress(0);
      setCurrentStage(prev => prev + 1);
    }, stage.duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [currentStage, stages, onComplete]);

  const isComplete = currentStage >= stages.length;

  return (
    <div className={`font-mono text-ops-neon-green space-y-4 ${className}`}>
      {stages.map((stage, index) => {
        const isActive = index === currentStage;
        const isDone = index < currentStage;

        return (
          <div
            key={index}
            className={`text-tactical-sm transition-opacity duration-300 ${
              isActive ? 'terminal-flicker' : isDone ? 'opacity-70' : 'opacity-30'
            }`}
          >
            <span className="text-ops-neon-cyan">&gt;</span> {stage.message}
            {isDone && <span className="text-ops-active ml-2">✓</span>}
          </div>
        );
      })}

      {!isComplete && currentStage < stages.length && (
        <div className="w-full bg-ops-night-surface border border-ops-neon-green/30 h-2 relative overflow-hidden">
          <div
            className="bg-ops-neon-green h-full transition-all duration-100 shadow-neon"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isComplete && (
        <div className="text-center text-tactical-lg animate-pulse-neon">
          <span className="text-ops-active">[ SYSTEM READY ]</span>
        </div>
      )}
    </div>
  );
}
