/**
 * Search API - Server-side search with ranking
 * Implements full-text search + scoring formula for zone discovery
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type SearchParams = {
  q: string;
  texture?: string;
  time?: 'day' | 'night';
  radius?: number;
  lat?: number;
  lon?: number;
  price_max?: number;
  max_hassle?: number;
  sort?: 'score' | 'distance' | 'price' | 'freshness';
  limit?: number;
};

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
  local_ratio: number;
  top_comment?: {
    short_tag: string;
    note: string;
    trust_score: number;
    verified: boolean;
  };
  distance_km?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const queryParams = req.query as { [key: string]: string | string[] | undefined };
    
    const q = typeof queryParams.q === 'string' ? queryParams.q : '';
    const texture = typeof queryParams.texture === 'string' ? queryParams.texture : undefined;
    const time = typeof queryParams.time === 'string' ? (queryParams.time as 'day' | 'night') : undefined;
    const radius = typeof queryParams.radius === 'string' ? parseFloat(queryParams.radius) : 50;
    const lat = typeof queryParams.lat === 'string' ? parseFloat(queryParams.lat) : undefined;
    const lon = typeof queryParams.lon === 'string' ? parseFloat(queryParams.lon) : undefined;
    const price_max = typeof queryParams.price_max === 'string' ? parseFloat(queryParams.price_max) : undefined;
    const max_hassle = typeof queryParams.max_hassle === 'string' ? parseFloat(queryParams.max_hassle) : 5;
    const sort = typeof queryParams.sort === 'string' ? queryParams.sort : 'score';
    const limit = typeof queryParams.limit === 'string' ? parseInt(queryParams.limit) : 20;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query too short (min 2 chars)' });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build search query
    let query = supabase
      .from('zones')
      .select(
        `
        id,
        city,
        name,
        anchor_name,
        anchor_coords,
        anchor_score,
        hassle_score,
        price_median,
        local_ratio,
        texture_tags,
        good_for_day,
        good_for_night,
        search_tokens
      `
      )
      .neq('status', 'OFFLINE');

    // Filter by hassle
    if (max_hassle) {
      query = query.lte('hassle_score', max_hassle);
    }

    // Filter by price
    if (price_max) {
      query = query.lte('price_median', price_max);
    }

    // Filter by time of day
    if (time === 'day') {
      query = query.eq('good_for_day', true);
    } else if (time === 'night') {
      query = query.eq('good_for_night', true);
    }

    const { data: zones, error: zoneError } = await query.limit(100);

    if (zoneError) {
      console.error('[Search] Zone query error:', zoneError);
      return res.status(500).json({ error: 'Search failed' });
    }

    if (!zones || zones.length === 0) {
      return res.status(200).json({ results: [], count: 0 });
    }

    // Scoring weights
    const weights = {
      textureMatch: 3.0,
      anchorQuality: 2.0,
      freshnessBoost: 1.0,
      hasslePenalty: 1.5,
      priceFit: 1.2,
      localRatio: 0.8,
    };

    // Calculate search score for each zone
    const searchQuery = q.toLowerCase();
    const scoredResults: SearchResult[] = [];

    for (const zone of zones) {
      // Text matching
      const searchText = `${zone.name} ${zone.anchor_name} ${zone.texture_tags?.join(' ') || ''} ${
        zone.search_tokens?.join(' ') || ''
      }`.toLowerCase();
      const textureMatch = searchText.includes(searchQuery) ? 1.0 : 0.0;

      // Texture filter match
      let textureBonus = 0;
      if (texture && zone.texture_tags) {
        textureBonus = zone.texture_tags.includes(texture) ? 1.5 : 0;
      }

      // Anchor quality (normalized 0-1)
      const anchorQuality = Math.min(zone.anchor_score / 100, 1.0);

      // Price fit (closer to budget = higher score)
      let priceFit = 1.0;
      if (price_max && zone.price_median) {
        priceFit = 1 - Math.abs(zone.price_median - price_max) / 100;
        priceFit = Math.max(0, priceFit);
      }

      // Hassle penalty
      const hasslePenalty = (zone.hassle_score || 0) / 10;

      // Local ratio bonus
      const localRatio = zone.local_ratio || 0.5;

      // Distance calculation (if lat/lon provided)
      let distanceKm = undefined;
      let distanceScore = 0;
      if (lat && lon && zone.anchor_coords) {
        const [zoneLon, zoneLat] = zone.anchor_coords;
        const latDiff = lat - zoneLat;
        const lonDiff = lon - zoneLon;
        distanceKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Rough km conversion
        if (radius && distanceKm > radius) {
          continue; // Skip zones outside radius
        }
        distanceScore = Math.max(0, 1 - distanceKm / 50); // Decay over 50km
      }

      // Freshness boost (TODO: based on recent comment activity)
      const freshnessBoost = 0.5;

      // Calculate final score
      const score =
        weights.textureMatch * (textureMatch + textureBonus) +
        weights.anchorQuality * anchorQuality +
        weights.freshnessBoost * freshnessBoost -
        weights.hasslePenalty * hasslePenalty +
        weights.priceFit * priceFit +
        weights.localRatio * localRatio +
        distanceScore * 2.0;

      // Fetch top comment for this zone
      const { data: comments } = await supabase
        .from('comments')
        .select('short_tag, note, trust_score, verified')
        .eq('zone_id', zone.id)
        .eq('moderated', false)
        .order('trust_score', { ascending: false })
        .limit(1);

      scoredResults.push({
        zone_id: zone.id,
        city: zone.city,
        zone_name: zone.name,
        anchor_name: zone.anchor_name,
        anchor_coords: zone.anchor_coords,
        score: Math.round(score * 100) / 100,
        texture_match: textureMatch + textureBonus,
        anchor_quality: anchorQuality,
        hassle_score: zone.hassle_score || 0,
        price_median: zone.price_median || 0,
        local_ratio: localRatio,
        top_comment: comments && comments[0] ? comments[0] : undefined,
        distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : undefined,
      });
    }

    // Sort results
    let sortedResults = scoredResults;
    switch (sort) {
      case 'distance':
        sortedResults = scoredResults.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
        break;
      case 'price':
        sortedResults = scoredResults.sort((a, b) => a.price_median - b.price_median);
        break;
      case 'freshness':
        sortedResults = scoredResults.sort((a, b) => b.score - a.score); // Same as score for now
        break;
      case 'score':
      default:
        sortedResults = scoredResults.sort((a, b) => b.score - a.score);
    }

    // Limit results
    const finalResults = sortedResults.slice(0, limit);

    return res.status(200).json({
      results: finalResults,
      count: finalResults.length,
      total_scanned: zones.length,
    });
  } catch (error) {
    console.error('[Search] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
