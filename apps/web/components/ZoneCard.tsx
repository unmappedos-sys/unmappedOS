/**
 * Zone Card Component
 * 
 * Displays zone information with:
 * - Confidence indicators
 * - Texture classification
 * - Pricing data
 * - Recent intel
 * - Action buttons
 */

import React from 'react';
import { ConfidenceBar, ConfidenceBadge, ZoneWarningBanner, IntelFreshnessIndicator } from './ConfidenceHUD';

// ============================================================================
// TYPES
// ============================================================================

export interface ZoneTexture {
  primary: string;
  secondary: string[];
  tourist_density: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  hassle_factor: number;
  walkability: number;
  time_tags: string[];
}

export interface ZonePricing {
  coffee_local?: number;
  coffee_tourist?: number;
  beer_local?: number;
  beer_tourist?: number;
  meal_street?: number;
  meal_restaurant?: number;
  transport_base?: number;
  currency: string;
  price_delta?: number;
  last_verified?: string;
}

export interface ZoneConfidence {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
  data_age_days: number;
  last_intel: string | null;
  last_verification: string | null;
  intel_count_24h: number;
  has_conflicts: boolean;
  offline_reason: string | null;
  is_offline: boolean;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  texture: ZoneTexture;
  pricing: ZonePricing;
  confidence: ZoneConfidence;
  center?: { lat: number; lng: number };
}

interface ZoneCardProps {
  zone: Zone;
  onIntelSubmit?: () => void;
  onNavigate?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ============================================================================
// TEXTURE ICON MAPPING
// ============================================================================

const TEXTURE_ICONS: Record<string, string> = {
  'night-market': '🌙',
  'street-food': '🍜',
  'backpacker': '🎒',
  'cultural': '🏛️',
  'modern-mall': '🏬',
  'local-market': '🛒',
  'bar-district': '🍺',
  'temple-area': '⛩️',
  'residential': '🏘️',
  'tourist-trap': '📸',
  'hidden-gem': '💎',
  'park': '🌳',
  'waterfront': '🌊',
  'transit-hub': '🚇',
};

// ============================================================================
// PRICE DISPLAY
// ============================================================================

function PriceDisplay({ pricing }: { pricing: ZonePricing }) {
  const hasPrices = pricing.coffee_local || pricing.beer_local || pricing.meal_street;
  
  if (!hasPrices) {
    return (
      <div className="text-xs text-gray-500 italic">
        No price data yet
      </div>
    );
  }

  const formatPrice = (local?: number, tourist?: number) => {
    if (!local) return null;
    
    return (
      <span>
        {pricing.currency} {local}
        {tourist && tourist > local && (
          <span className="text-red-400 text-xs ml-1">
            (tourist: {tourist})
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {pricing.coffee_local && (
        <div className="flex items-center gap-1">
          <span>☕</span>
          {formatPrice(pricing.coffee_local, pricing.coffee_tourist)}
        </div>
      )}
      {pricing.beer_local && (
        <div className="flex items-center gap-1">
          <span>🍺</span>
          {formatPrice(pricing.beer_local, pricing.beer_tourist)}
        </div>
      )}
      {pricing.meal_street && (
        <div className="flex items-center gap-1">
          <span>🍜</span>
          <span>{pricing.currency} {pricing.meal_street}</span>
        </div>
      )}
      {pricing.meal_restaurant && (
        <div className="flex items-center gap-1">
          <span>🍽️</span>
          <span>{pricing.currency} {pricing.meal_restaurant}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TEXTURE DISPLAY
// ============================================================================

function TextureDisplay({ texture }: { texture: ZoneTexture }) {
  const primaryIcon = TEXTURE_ICONS[texture.primary] || '📍';
  
  const touristColors = {
    LOW: 'text-green-400',
    MEDIUM: 'text-yellow-400',
    HIGH: 'text-orange-400',
    EXTREME: 'text-red-400',
  };

  return (
    <div className="space-y-2">
      {/* Primary texture */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{primaryIcon}</span>
        <span className="text-sm text-white capitalize">
          {texture.primary.replace(/-/g, ' ')}
        </span>
      </div>

      {/* Secondary textures */}
      {texture.secondary.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {texture.secondary.slice(0, 3).map((t) => (
            <span 
              key={t} 
              className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400"
            >
              {TEXTURE_ICONS[t] || ''} {t.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Metrics */}
      <div className="flex gap-4 text-xs">
        <div className={touristColors[texture.tourist_density]}>
          👥 {texture.tourist_density.toLowerCase()} tourists
        </div>
        <div className="text-gray-400">
          🚶 {texture.walkability}/10 walkable
        </div>
      </div>

      {/* Hassle factor */}
      {texture.hassle_factor > 5 && (
        <div className="flex items-center gap-1 text-xs text-orange-400">
          <span>⚡</span>
          <span>Hassle factor: {texture.hassle_factor}/10</span>
        </div>
      )}

      {/* Time tags */}
      {texture.time_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {texture.time_tags.map((tag) => (
            <span 
              key={tag}
              className="text-xs px-2 py-0.5 bg-green-900/30 border border-green-700/30 rounded text-green-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MINI CARD (Collapsed)
// ============================================================================

export function ZoneCardMini({ 
  zone, 
  onClick 
}: { 
  zone: Zone; 
  onClick?: () => void;
}) {
  const { confidence, texture, pricing } = zone;
  const primaryIcon = TEXTURE_ICONS[texture.primary] || '📍';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        confidence.is_offline
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className="text-2xl">{primaryIcon}</span>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">
              {zone.name}
            </span>
            <ConfidenceBadge 
              score={confidence.score} 
              isOffline={confidence.is_offline} 
            />
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="capitalize">{texture.primary.replace(/-/g, ' ')}</span>
            {pricing.coffee_local && (
              <span>☕ {pricing.currency} {pricing.coffee_local}</span>
            )}
          </div>
        </div>

        {/* Freshness */}
        <IntelFreshnessIndicator 
          lastIntelAt={confidence.last_intel} 
        />
      </div>
    </button>
  );
}

// ============================================================================
// MAIN ZONE CARD
// ============================================================================

export function ZoneCard({ 
  zone, 
  onIntelSubmit, 
  onNavigate,
  isExpanded = true,
  onToggleExpand,
}: ZoneCardProps) {
  const { confidence, texture, pricing } = zone;

  return (
    <div className={`bg-gray-900 border rounded-lg overflow-hidden ${
      confidence.is_offline 
        ? 'border-red-700/50' 
        : 'border-gray-800'
    }`}>
      {/* Offline Warning Banner */}
      {confidence.is_offline && (
        <ZoneWarningBanner 
          reason={confidence.offline_reason || 'Zone temporarily offline'} 
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-3xl mt-1">
            {TEXTURE_ICONS[texture.primary] || '📍'}
          </span>
          
          {/* Title & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white truncate">
                {zone.name}
              </h3>
              <ConfidenceBadge 
                score={confidence.score} 
                isOffline={confidence.is_offline}
              />
            </div>
            
            {zone.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {zone.description}
              </p>
            )}
          </div>

          {/* Expand Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-500 hover:text-white"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Confidence Bar */}
        <div className="mt-3">
          <ConfidenceBar 
            score={confidence.score}
            level={confidence.level}
            dataAgeDays={confidence.data_age_days}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Texture Section */}
          <div className="p-4 border-b border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Zone Texture
            </div>
            <TextureDisplay texture={texture} />
          </div>

          {/* Pricing Section */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Local Prices
              </div>
              {pricing.last_verified && (
                <div className="text-xs text-gray-600">
                  Verified: {new Date(pricing.last_verified).toLocaleDateString()}
                </div>
              )}
            </div>
            <PriceDisplay pricing={pricing} />
            
            {/* Price Delta Warning */}
            {pricing.price_delta !== undefined && pricing.price_delta > 0.3 && (
              <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>Tourist prices {Math.round(pricing.price_delta * 100)}% higher</span>
              </div>
            )}
          </div>

          {/* Intel Status */}
          <div className="p-4 border-b border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Intel Status
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">
                <span className="text-gray-600">24h reports:</span>{' '}
                <span className="text-white">{confidence.intel_count_24h}</span>
              </div>
              <div className="text-gray-400">
                <span className="text-gray-600">Data age:</span>{' '}
                <span className={confidence.data_age_days > 30 ? 'text-orange-400' : 'text-white'}>
                  {confidence.data_age_days}d
                </span>
              </div>
              {confidence.last_verification && (
                <div className="col-span-2 text-gray-400">
                  <span className="text-gray-600">Last verified:</span>{' '}
                  <span className="text-white">
                    {new Date(confidence.last_verification).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Conflict Warning */}
            {confidence.has_conflicts && (
              <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-400">
                ⚠️ Conflicting reports detected - confidence reduced
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-2">
            <button
              onClick={onIntelSubmit}
              disabled={confidence.is_offline}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-medium text-sm transition-colors"
            >
              📡 Submit Intel
            </button>
            <button
              onClick={onNavigate}
              className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded font-medium text-sm transition-colors"
            >
              🧭 Navigate
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// ZONE LIST
// ============================================================================

interface ZoneListProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
  emptyMessage?: string;
  showConfidenceFilter?: boolean;
}

export function ZoneList({ 
  zones, 
  onSelectZone,
  emptyMessage = 'No zones found',
  showConfidenceFilter = true,
}: ZoneListProps) {
  const [filterLevel, setFilterLevel] = React.useState<string>('all');

  const filteredZones = filterLevel === 'all' 
    ? zones 
    : zones.filter(z => z.confidence.level === filterLevel);

  // Sort by confidence (higher first)
  const sortedZones = [...filteredZones].sort(
    (a, b) => b.confidence.score - a.confidence.score
  );

  return (
    <div className="space-y-3">
      {/* Filter */}
      {showConfidenceFilter && zones.length > 0 && (
        <div className="flex gap-1 mb-3">
          {['all', 'HIGH', 'MEDIUM', 'LOW', 'DEGRADED'].map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-2 py-1 text-xs rounded ${
                filterLevel === level
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {level === 'all' ? 'All' : level}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedZones.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      )}

      {/* Zone Cards */}
      {sortedZones.map((zone) => (
        <ZoneCardMini
          key={zone.id}
          zone={zone}
          onClick={() => onSelectZone(zone)}
        />
      ))}
    </div>
  );
}

export default ZoneCard;
