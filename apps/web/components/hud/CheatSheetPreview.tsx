import { useCallback, useState } from 'react';
import { CityAccent, CITY_COLORS, CheatSheetItem } from './types';

interface CheatSheetPreviewProps {
  items: CheatSheetItem[];
  totalItems: number;
  cityAccent?: CityAccent;
  onDownloadPack?: () => void;
  packDownloaded?: boolean;
  className?: string;
}

// Default preview items for demo
const DEFAULT_ITEMS: CheatSheetItem[] = [
  {
    id: '1',
    category: 'SCAM',
    preview: 'AVOID: "GRAND PALACE IS CLOSED" CLAIM',
    full: 'If a driver claims a "Monk Holiday," ignore it. The Palace is open daily until 15:30. Walk to the white gate.',
  },
  {
    id: '2',
    category: 'TIP',
    preview: 'METERED TAXI PROTOCOL',
    full: 'Insist on meter. If refused, exit immediately. Next taxi will comply. Standard flag: 35฿.',
  },
  {
    id: '3',
    category: 'PHRASE',
    preview: 'PRICE CHECK PHRASE',
    full: '"Tao-rai?" (How much?) - Use before any transaction. Locals expect negotiation.',
  },
];

/**
 * CheatSheetPreview: Teaser component for tactical intel
 *
 * Purpose: Hook + trust before download
 * Visual: Holographic / torn-edge card with noise texture
 * Shows blurred preview, tap to reveal full content
 */
export default function CheatSheetPreview({
  items = DEFAULT_ITEMS,
  totalItems = 15,
  cityAccent = 'default',
  onDownloadPack,
  packDownloaded = false,
  className = '',
}: CheatSheetPreviewProps) {
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const colors = CITY_COLORS[cityAccent];

  const handleReveal = useCallback((id: string) => {
    setRevealedId((prev) => (prev === id ? null : id));
  }, []);

  const getCategoryIcon = (category: CheatSheetItem['category']) => {
    switch (category) {
      case 'SCAM':
        return '⚠';
      case 'TIP':
        return '◈';
      case 'PHRASE':
        return '◇';
      case 'CUSTOM':
        return '●';
    }
  };

  const getCategoryColor = (category: CheatSheetItem['category']) => {
    switch (category) {
      case 'SCAM':
        return '#FF0040';
      case 'TIP':
        return '#00FF41';
      case 'PHRASE':
        return '#00F5FF';
      case 'CUSTOM':
        return colors.primary;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-2 h-2 rotate-45"
          style={{ backgroundColor: colors.primary, boxShadow: `0 0 8px ${colors.glow}` }}
        />
        <h2
          className="font-mono text-xs tracking-[0.3em] uppercase"
          style={{ color: colors.primary }}
        >
          TACTICAL INTEL (PREVIEW)
        </h2>
        <div className="flex-1 h-px" style={{ backgroundColor: `${colors.primary}30` }} />
      </div>

      {/* Cards container */}
      <div className="space-y-3">
        {items.map((item) => {
          const isRevealed = revealedId === item.id;
          const catColor = getCategoryColor(item.category);

          return (
            <button
              key={item.id}
              onClick={() => handleReveal(item.id)}
              className="w-full text-left group relative"
            >
              {/* Holographic card */}
              <div
                className="relative border overflow-hidden transition-all duration-300"
                style={{
                  borderColor: `${catColor}40`,
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(20,20,20,0.9))',
                }}
              >
                {/* Noise texture overlay */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Holographic shimmer */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                  style={{
                    background: `linear-gradient(120deg, transparent 30%, ${catColor}40 50%, transparent 70%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite',
                  }}
                />

                {/* Top accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: catColor }}
                />

                {/* Content */}
                <div className="p-4 relative">
                  {/* Category badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: catColor }}>{getCategoryIcon(item.category)}</span>
                    <span
                      className="font-mono text-[10px] tracking-widest uppercase"
                      style={{ color: catColor }}
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Preview text */}
                  <div
                    className="font-mono text-sm text-ops-night-text mb-2"
                    style={{ textShadow: isRevealed ? 'none' : '0 0 8px rgba(255,255,255,0.5)' }}
                  >
                    {item.preview}
                  </div>

                  {/* Full text - blurred until revealed */}
                  <div
                    className={`
                      font-mono text-xs text-ops-night-text/80 leading-relaxed
                      transition-all duration-300 overflow-hidden
                      ${isRevealed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
                    `}
                  >
                    <div className="pt-2 mt-2 border-t border-ops-night-border/30">{item.full}</div>
                  </div>

                  {/* Blur overlay when not revealed */}
                  {!isRevealed && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))',
                      }}
                    />
                  )}

                  {/* Tap indicator */}
                  <div
                    className="absolute bottom-2 right-2 font-mono text-[10px] opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ color: catColor }}
                  >
                    {isRevealed ? 'TAP TO COLLAPSE' : 'TAP TO REVEAL'}
                  </div>
                </div>

                {/* Torn edge effect */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{
                    background: `repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 4px,
                      ${catColor}20 4px,
                      ${catColor}20 8px
                    )`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Upsell */}
      {!packDownloaded && (
        <div
          className="mt-4 p-4 border text-center"
          style={{
            borderColor: `${colors.primary}30`,
            borderStyle: 'dashed',
          }}
        >
          <div className="font-mono text-xs tracking-wider mb-3" style={{ color: colors.primary }}>
            DOWNLOAD CITY PACK TO UNLOCK {totalItems}+ TACTICAL NOTES
          </div>
          {onDownloadPack && (
            <button
              onClick={onDownloadPack}
              className="font-mono text-xs px-4 py-2 border transition-all hover:bg-white/5"
              style={{
                borderColor: colors.primary,
                color: colors.primary,
              }}
            >
              INITIATE SYNC
            </button>
          )}
        </div>
      )}

      {/* Full access indicator */}
      {packDownloaded && (
        <div
          className="mt-4 flex items-center justify-center gap-2 font-mono text-xs"
          style={{ color: colors.primary }}
        >
          <span className="text-ops-active">✓</span>
          <span>FULL ACCESS — {totalItems} NOTES AVAILABLE</span>
        </div>
      )}
    </div>
  );
}
