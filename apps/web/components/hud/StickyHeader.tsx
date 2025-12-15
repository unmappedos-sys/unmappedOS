import { useEffect, useState } from 'react';
import { CityAccent, CITY_COLORS } from './types';

interface StickyHeaderProps {
  cityName: string;
  cityCode: string;
  cityAccent?: CityAccent;
  isActive?: boolean;
  isOffline?: boolean;
  scrollThreshold?: number;
  className?: string;
}

/**
 * StickyHeader: Compressed header that appears on scroll
 *
 * Behavior: City name sticks to top on scroll, compresses into minimal format
 * Format: TOKYO [ ACTIVE ]
 * Includes: Mode status, quick actions
 */
export default function StickyHeader({
  cityName,
  cityCode,
  cityAccent = 'default',
  isActive = true,
  isOffline = false,
  scrollThreshold = 300,
  className = '',
}: StickyHeaderProps) {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const colors = CITY_COLORS[cityAccent];

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > scrollThreshold);

      // Calculate scroll progress for parallax effects
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(Math.min(scrollY / maxScroll, 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollThreshold]);

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        ${className}
      `}
    >
      {/* Background with blur */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderBottom: `1px solid ${colors.primary}40`,
        }}
      />

      {/* Content */}
      <div className="relative px-4 py-3 flex items-center justify-between">
        {/* Left: City name */}
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isOffline ? '#FFB000' : colors.primary,
              boxShadow: `0 0 8px ${isOffline ? '#FFB000' : colors.glow}`,
              animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            className="font-mono text-lg tracking-[0.2em] font-bold"
            style={{ color: colors.primary }}
          >
            {cityName.toUpperCase()}
          </span>
          <span
            className="font-mono text-xs px-2 py-0.5 border"
            style={{
              borderColor: isOffline ? '#FFB000' : colors.primary,
              color: isOffline ? '#FFB000' : colors.primary,
            }}
          >
            {isOffline ? 'OFFLINE' : isActive ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        {/* Right: Quick info */}
        <div className="flex items-center gap-4">
          {/* City code */}
          <span
            className="font-mono text-xs tracking-widest opacity-60"
            style={{ color: colors.primary }}
          >
            {cityCode}
          </span>

          {/* Scroll progress indicator */}
          <div className="w-12 h-1 bg-ops-night-border overflow-hidden">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${scrollProgress * 100}%`,
                backgroundColor: colors.primary,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-100"
        style={{
          width: `${scrollProgress * 100}%`,
          backgroundColor: colors.primary,
          boxShadow: `0 0 10px ${colors.glow}`,
        }}
      />
    </div>
  );
}
