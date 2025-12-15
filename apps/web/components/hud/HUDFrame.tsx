import { ReactNode } from 'react';
import { CityAccent, CITY_COLORS } from './types';

interface HUDFrameProps {
  children: ReactNode;
  cityAccent?: CityAccent;
  showScanLine?: boolean;
  showGrid?: boolean;
  className?: string;
}

/**
 * HUDFrame: Container component with tactical aesthetics
 *
 * Provides consistent framing for HUD content with:
 * - Corner brackets
 * - Optional scan line effect
 * - Optional grid overlay
 * - Consistent border styling
 */
export default function HUDFrame({
  children,
  cityAccent = 'default',
  showScanLine = false,
  showGrid = true,
  className = '',
}: HUDFrameProps) {
  const colors = CITY_COLORS[cityAccent];

  return (
    <div
      className={`relative bg-black overflow-hidden ${className}`}
      style={{
        border: `1px solid ${colors.primary}30`,
      }}
    >
      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(${colors.primary}40 1px, transparent 1px),
              linear-gradient(90deg, ${colors.primary}40 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {/* Scan line effect */}
      {showScanLine && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-20 opacity-20"
            style={{
              background: `linear-gradient(to bottom, transparent, ${colors.primary}30, transparent)`,
              animation: 'scan 4s linear infinite',
            }}
          />
        </div>
      )}

      {/* Corner brackets */}
      <div
        className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 pointer-events-none"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 pointer-events-none"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 pointer-events-none"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 pointer-events-none"
        style={{ borderColor: colors.primary }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Top glow line */}
      <div
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
        }}
      />

      {/* Bottom glow line */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
        }}
      />
    </div>
  );
}
