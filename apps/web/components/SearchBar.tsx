/**
 * SearchBar Component - Tactical zone search with filters
 * Implements server-side and client-side search with texture filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useRouter } from 'next/router';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

type SearchResult = {
  zone_id: string;
  city: string;
  zone_name: string;
  anchor_name: string;
  anchor_coords: [number, number];
  score: number;
  texture_match: number;
  anchor_quality: number;
  hassle_score: number;
  price_median: number;
  distance_km?: number;
};

type SearchBarProps = {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
};

const TEXTURE_FILTERS = [
  'MARKETS',
  'TEMPLES',
  'NIGHTLIFE',
  'STREET_FOOD',
  'CAFES',
  'PARKS',
  'ROOFTOPS',
  'HISTORIC',
  'SHOPPING',
  'LOCAL',
];

export default function SearchBar({ onResultSelect, className = '' }: SearchBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [texture, setTexture] = useState('');
  const [timeFilter, setTimeFilter] = useState<'day' | 'night' | ''>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string, searchTexture: string, searchTime: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          ...(searchTexture && { texture: searchTexture }),
          ...(searchTime && { time: searchTime }),
          limit: '10',
        });

        const response = await fetch(`/api/search?${params}`);
        if (!response.ok) {
          throw new Error('SCAN FAILED // RETRY');
        }

        const data = await response.json();
        setResults(data.results || []);
        setShowResults(true);
      } catch (err: any) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    performSearch(query, texture, timeFilter);
  }, [query, texture, timeFilter]);

  const handleResultClick = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Navigate to map view
      router.push(`/map/${result.city}?zone=${result.zone_id}`);
    }
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="border-2 border-green-500 bg-black">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="SCAN SECTOR..."
          className="w-full bg-transparent p-4 font-mono text-green-400 placeholder:text-green-500/50 focus:outline-none"
        />

        {/* Filters */}
        <div className="flex gap-2 border-t border-green-500/30 p-2">
          {/* Texture Filter */}
          <select
            value={texture}
            onChange={(e) => setTexture(e.target.value)}
            className="flex-1 border border-green-500/50 bg-black p-2 text-xs text-green-400 focus:border-green-500 focus:outline-none"
          >
            <option value="">ALL TEXTURES</option>
            {TEXTURE_FILTERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as 'day' | 'night' | '')}
            className="border border-green-500/50 bg-black p-2 text-xs text-green-400 focus:border-green-500 focus:outline-none"
          >
            <option value="">ANY TIME</option>
            <option value="day">DAY OPS</option>
            <option value="night">NIGHT OPS</option>
          </select>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 border border-green-500/50 bg-black p-4 text-center text-sm text-green-500">
          SCANNING...
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 border border-red-500 bg-black p-4 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && results.length > 0 && !loading && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-96 overflow-y-auto border-2 border-green-500 bg-black shadow-[0_0_20px_rgba(0,255,0,0.3)]">
          {results.map((result) => (
            <div
              key={result.zone_id}
              onClick={() => handleResultClick(result)}
              className="cursor-pointer border-b border-green-500/20 p-4 transition hover:bg-green-500/10"
            >
              {/* Zone Info */}
              <div className="mb-1 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-green-500">{result.zone_name}</h3>
                  <p className="text-xs text-green-400/70">
                    ANCHOR: {result.anchor_name} • {result.city.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-500">SCORE: {result.score}</div>
                  {result.distance_km && (
                    <div className="text-xs text-green-400/70">{result.distance_km}km</div>
                  )}
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="mt-2 flex gap-3 text-xs">
                <span className="text-green-400">
                  ANCHOR: {Math.round(result.anchor_quality * 100)}%
                </span>
                <span className="text-yellow-500">HASSLE: {result.hassle_score}/10</span>
                {result.price_median > 0 && (
                  <span className="text-blue-400">${result.price_median}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 border border-green-500/50 bg-black p-4 text-center text-sm text-green-400/70">
          NO SECTORS FOUND // ADJUST PARAMETERS
        </div>
      )}
    </div>
  );
}
