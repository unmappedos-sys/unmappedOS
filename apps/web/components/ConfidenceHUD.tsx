/**
 * Zone Confidence HUD Component
 * 
 * Displays confidence indicators for zones:
 * - Confidence bar with level
 * - Last verification time
 * - Anomaly/hazard warnings
 * - Offline status with reason
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED' | 'UNKNOWN';
export type ZoneState = 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

export interface ZoneConfidenceDisplay {
  score: number;
  level: ConfidenceLevel;
  state: ZoneState;
  last_verified_at: string | null;
  last_intel_at: string | null;
  hazard_active: boolean;
  hazard_reason?: string;
  anomaly_detected: boolean;
  anomaly_reason?: string;
}

export interface ConfidenceHUDProps {
  confidence: ZoneConfidenceDisplay;
  compact?: boolean;
  showBar?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const LEVEL_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: '#22c55e',      // green-500
  MEDIUM: '#eab308',    // yellow-500
  LOW: '#f97316',       // orange-500
  DEGRADED: '#ef4444',  // red-500
  UNKNOWN: '#6b7280',   // gray-500
};

const LEVEL_BG_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-green-500/20',
  MEDIUM: 'bg-yellow-500/20',
  LOW: 'bg-orange-500/20',
  DEGRADED: 'bg-red-500/20',
  UNKNOWN: 'bg-gray-500/20',
};

const LEVEL_TEXT_COLORS: Record<ConfidenceLevel, string> = {
  HIGH: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-orange-400',
  DEGRADED: 'text-red-400',
  UNKNOWN: 'text-gray-400',
};

const LEVEL_ICONS: Record<ConfidenceLevel, string> = {
  HIGH: '◉',
  MEDIUM: '◎',
  LOW: '○',
  DEGRADED: '⊘',
  UNKNOWN: '?',
};

function formatTimeAgo(isoDate: string | null): string {
  if (!isoDate) return 'NEVER';
  
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return '< 1H AGO';
  if (diffHours < 24) return `${diffHours}H AGO`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 DAY AGO';
  if (diffDays < 7) return `${diffDays} DAYS AGO`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} WEEK${diffWeeks > 1 ? 'S' : ''} AGO`;
}

// ============================================================================
// CONFIDENCE BAR
// ============================================================================

export function ConfidenceBar({ 
  score, 
  level,
  size = 'md' 
}: { 
  score: number; 
  level: ConfidenceLevel;
  size?: 'sm' | 'md' | 'lg';
}) {
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
  
  return (
    <div className={`w-full bg-gray-800 rounded-full overflow-hidden ${heights[size]}`}>
      <div
        className="h-full transition-all duration-500 rounded-full"
        style={{
          width: `${score}%`,
          backgroundColor: LEVEL_COLORS[level],
        }}
      />
    </div>
  );
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

// Helper to convert score to level
function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  if (score >= 20) return 'DEGRADED';
  return 'UNKNOWN';
}

type ConfidenceBadgeProps = 
  | { level: ConfidenceLevel; compact?: boolean; score?: never; isOffline?: never; }
  | { score: number; isOffline?: boolean; level?: never; compact?: boolean; };

export function ConfidenceBadge(props: ConfidenceBadgeProps) {
  const { compact = false } = props;
  
  // Determine the level from either direct level prop or score
  let level: ConfidenceLevel;
  if ('level' in props && props.level) {
    level = props.level;
  } else if ('score' in props && props.score !== undefined) {
    level = props.isOffline ? 'DEGRADED' : scoreToLevel(props.score);
  } else {
    level = 'UNKNOWN';
  }
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs uppercase tracking-wider
        ${LEVEL_BG_COLORS[level]} ${LEVEL_TEXT_COLORS[level]}
      `}
    >
      <span>{LEVEL_ICONS[level]}</span>
      {!compact && <span>{level}</span>}
    </span>
  );
}

// ============================================================================
// WARNING BANNER
// ============================================================================

export function ZoneWarningBanner({ 
  type, 
  message 
}: { 
  type: 'hazard' | 'anomaly' | 'degraded'; 
  message: string;
}) {
  const styles = {
    hazard: 'bg-red-900/50 border-red-500 text-red-300',
    anomaly: 'bg-yellow-900/50 border-yellow-500 text-yellow-300',
    degraded: 'bg-orange-900/50 border-orange-500 text-orange-300',
  };
  
  const icons = {
    hazard: '⚠️',
    anomaly: '⚡',
    degraded: '📉',
  };
  
  return (
    <div className={`border-l-4 px-3 py-2 text-sm font-mono ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {message}
    </div>
  );
}

// ============================================================================
// MAIN HUD COMPONENT
// ============================================================================

export function ConfidenceHUD({ 
  confidence, 
  compact = false,
  showBar = true,
  className = '',
}: ConfidenceHUDProps) {
  const { score, level, state, last_verified_at, last_intel_at, hazard_active, hazard_reason, anomaly_detected, anomaly_reason } = confidence;
  
  // Offline state - show warning
  if (state === 'OFFLINE' || hazard_active) {
    return (
      <div className={`space-y-2 ${className}`}>
        <ZoneWarningBanner 
          type="hazard" 
          message={hazard_reason || 'ZONE OFFLINE: Safety concern reported'} 
        />
        <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>LAST INTEL: {formatTimeAgo(last_intel_at)}</span>
        </div>
      </div>
    );
  }
  
  // Compact mode
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ConfidenceBadge level={level} compact />
        <span className="text-xs text-gray-500 font-mono">
          {formatTimeAgo(last_intel_at)}
        </span>
        {anomaly_detected && (
          <span className="text-yellow-400 text-xs">⚡</span>
        )}
      </div>
    );
  }
  
  // Full HUD
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Anomaly Warning */}
      {anomaly_detected && (
        <ZoneWarningBanner 
          type="anomaly" 
          message={anomaly_reason || 'Unusual activity detected. Intel may be unreliable.'} 
        />
      )}
      
      {/* Degraded Warning */}
      {state === 'DEGRADED' && !anomaly_detected && (
        <ZoneWarningBanner 
          type="degraded" 
          message="Limited recent intel. Verify conditions on ground." 
        />
      )}
      
      {/* Main Confidence Display */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span 
              className="text-lg"
              style={{ color: LEVEL_COLORS[level] }}
            >
              {LEVEL_ICONS[level]}
            </span>
            <span className={`font-mono text-sm uppercase tracking-wider ${LEVEL_TEXT_COLORS[level]}`}>
              {level} CONFIDENCE
            </span>
          </div>
          <span className="font-mono text-lg" style={{ color: LEVEL_COLORS[level] }}>
            {Math.round(score)}%
          </span>
        </div>
        
        {/* Confidence Bar */}
        {showBar && (
          <div className="mb-3">
            <ConfidenceBar score={score} level={level} />
          </div>
        )}
        
        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">LAST VERIFIED:</span>
            <span className={last_verified_at ? 'text-gray-400' : 'text-gray-600'}>
              {formatTimeAgo(last_verified_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">INTEL:</span>
            <span className="text-gray-400">
              {formatTimeAgo(last_intel_at)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Explanation */}
      <p className="text-xs text-gray-500 font-mono leading-relaxed">
        {level === 'HIGH' && 'Recently verified by operatives. Intel is reliable.'}
        {level === 'MEDIUM' && 'Some recent intel. Generally reliable.'}
        {level === 'LOW' && 'Limited recent intel. Verify conditions yourself.'}
        {level === 'DEGRADED' && 'Stale data or active concerns. Use caution.'}
        {level === 'UNKNOWN' && 'No intel available for this zone.'}
      </p>
    </div>
  );
}

// ============================================================================
// ZONE STATUS INDICATOR (FOR MAP MARKERS)
// ============================================================================

export function ZoneStatusIndicator({ 
  level, 
  state,
  size = 'md' 
}: { 
  level: ConfidenceLevel; 
  state: ZoneState;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  const color = state === 'OFFLINE' 
    ? LEVEL_COLORS.DEGRADED 
    : LEVEL_COLORS[level];
  
  return (
    <div className="relative">
      <div 
        className={`rounded-full ${sizes[size]}`}
        style={{ backgroundColor: color }}
      />
      {state === 'OFFLINE' && (
        <div className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
      )}
    </div>
  );
}

// ============================================================================
// INTEL FRESHNESS INDICATOR
// ============================================================================

export function IntelFreshnessIndicator({ 
  lastIntelAt 
}: { 
  lastIntelAt: string | null;
}) {
  if (!lastIntelAt) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        <span>NO INTEL</span>
      </div>
    );
  }
  
  const date = new Date(lastIntelAt);
  const now = new Date();
  const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  let color = 'bg-green-500';
  let textColor = 'text-green-400';
  if (hoursAgo > 168) { // > 1 week
    color = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (hoursAgo > 72) { // > 3 days
    color = 'bg-orange-500';
    textColor = 'text-orange-400';
  } else if (hoursAgo > 24) { // > 1 day
    color = 'bg-yellow-500';
    textColor = 'text-yellow-400';
  }
  
  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span>{formatTimeAgo(lastIntelAt)}</span>
    </div>
  );
}
