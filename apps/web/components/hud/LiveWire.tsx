import { useEffect, useRef, useState } from 'react';
import { CityAccent, CITY_COLORS, IntelEvent } from './types';

interface LiveWireProps {
  events?: IntelEvent[];
  cityAccent?: CityAccent;
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

// Default demo events
const DEFAULT_EVENTS: IntelEvent[] = [
  {
    id: '1',
    type: 'PRICE_VERIFIED',
    message: 'OPERATIVE_99 VERIFIED PRICE — SILENCE ZONE',
    timestamp: Date.now(),
  },
  {
    id: '2',
    type: 'HAZARD_REPORTED',
    message: 'NEW HAZARD: CONSTRUCTION — ANCHOR 4',
    timestamp: Date.now() - 60000,
  },
  {
    id: '3',
    type: 'INTEL_UPDATED',
    message: 'INTEL CONFIDENCE UPDATED — SECTOR 2',
    timestamp: Date.now() - 120000,
  },
  {
    id: '4',
    type: 'OPERATIVE_ACTIVE',
    message: 'FIELD OPERATIVE ACTIVE — ZONE 7',
    timestamp: Date.now() - 180000,
  },
  {
    id: '5',
    type: 'PRICE_VERIFIED',
    message: 'LOCAL RATE CONFIRMED — TRANSIT HUB',
    timestamp: Date.now() - 240000,
  },
];

const SPEED_MAP = {
  slow: 60,
  normal: 40,
  fast: 25,
};

/**
 * LiveWire: Horizontal ticker showing system aliveness
 *
 * Purpose: Prove freshness without social feeds
 * Rules:
 * - Anonymous
 * - Aggregated
 * - No precise timestamps (avoid fake realtime claims)
 */
export default function LiveWire({
  events = DEFAULT_EVENTS,
  cityAccent = 'default',
  speed = 'slow',
  className = '',
}: LiveWireProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const colors = CITY_COLORS[cityAccent];

  // Calculate content width
  useEffect(() => {
    if (containerRef.current) {
      const content = containerRef.current.querySelector('[data-ticker-content]');
      if (content) {
        setContentWidth(content.scrollWidth / 2); // Divided by 2 because content is duplicated
      }
    }
  }, [events]);

  // Animate ticker
  useEffect(() => {
    if (contentWidth === 0) return;

    const duration = SPEED_MAP[speed];
    let animationFrame: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Calculate offset based on time
      const pixelsPerSecond = contentWidth / duration;
      const newOffset = ((elapsed * pixelsPerSecond) / 1000) % contentWidth;

      setOffset(newOffset);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [contentWidth, speed]);

  const getEventIcon = (type: IntelEvent['type']) => {
    switch (type) {
      case 'PRICE_VERIFIED':
        return '◆';
      case 'HAZARD_REPORTED':
        return '⚠';
      case 'INTEL_UPDATED':
        return '◈';
      case 'OPERATIVE_ACTIVE':
        return '●';
      default:
        return '◇';
    }
  };

  const getEventColor = (type: IntelEvent['type']) => {
    switch (type) {
      case 'PRICE_VERIFIED':
        return '#00FF41';
      case 'HAZARD_REPORTED':
        return '#FFB000';
      case 'INTEL_UPDATED':
        return '#00F5FF';
      case 'OPERATIVE_ACTIVE':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  // Create ticker content
  const tickerContent = events.map((event) => (
    <span key={event.id} className="inline-flex items-center gap-2 whitespace-nowrap px-6">
      <span style={{ color: getEventColor(event.type) }}>{getEventIcon(event.type)}</span>
      <span className="text-ops-night-text/80">{event.message}</span>
      <span className="text-ops-night-muted">•</span>
    </span>
  ));

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: colors.primary, boxShadow: `0 0 6px ${colors.glow}` }}
        />
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: colors.primary }}
        >
          LIVE WIRE
        </span>
      </div>

      {/* Ticker container */}
      <div
        ref={containerRef}
        className="relative py-3 border-y overflow-hidden"
        style={{ borderColor: `${colors.primary}20` }}
      >
        {/* Fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to right, black, transparent)`,
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to left, black, transparent)`,
          }}
        />

        {/* Scrolling content */}
        <div
          data-ticker-content
          className="flex font-mono text-xs tracking-wide"
          style={{
            transform: `translateX(-${offset}px)`,
            willChange: 'transform',
          }}
        >
          {/* Duplicate content for seamless loop */}
          {tickerContent}
          {tickerContent}
        </div>
      </div>

      {/* Status indicator */}
      <div
        className="mt-2 flex items-center justify-end gap-2 font-mono text-[10px]"
        style={{ color: `${colors.primary}50` }}
      >
        <span className="animate-pulse">◉</span>
        <span>AGGREGATED • ANONYMOUS</span>
      </div>
    </div>
  );
}
