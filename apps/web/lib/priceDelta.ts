/**
 * Price Delta Engine
 * 
 * Handles price tracking, zone medians, and overpricing alerts.
 */

import { createServiceClient } from './supabaseService';

export interface PriceSubmission {
  zone_id: string;
  city: string;
  category: string;
  amount: number;
  currency: string;
  notes?: string;
  coordinates?: { lat: number; lon: number };
}

export interface ZonePriceStats {
  category: string;
  median: number;
  average: number;
  min: number;
  max: number;
  sample_count: number;
  currency: string;
  last_updated: string;
}

export interface PriceDelta {
  category: string;
  submitted_price: number;
  zone_median: number;
  delta_amount: number;
  delta_percentage: number;
  status: 'NORMAL' | 'HIGH' | 'OVERPRICED' | 'BARGAIN';
}

// Thresholds for price status
const DELTA_THRESHOLDS = {
  BARGAIN: -15,      // <= -15% below median
  NORMAL_LOW: -15,   // -15% to +10%
  NORMAL_HIGH: 10,
  HIGH: 25,          // +10% to +25%
  OVERPRICED: 25,    // > +25%
};

/**
 * Submit a new price observation
 */
export async function submitPrice(
  userId: string,
  submission: PriceSubmission
): Promise<{ priceId: string; delta: PriceDelta | null }> {
  const supabase = createServiceClient();

  // Get current zone median for this category
  const stats = await getZonePriceStats(submission.zone_id, submission.city, submission.category);

  // Calculate delta if we have stats
  let delta: PriceDelta | null = null;
  let deltaPercentage: number | null = null;

  if (stats && stats.sample_count >= 3) {
    deltaPercentage = ((submission.amount - stats.median) / stats.median) * 100;
    delta = {
      category: submission.category,
      submitted_price: submission.amount,
      zone_median: stats.median,
      delta_amount: submission.amount - stats.median,
      delta_percentage: deltaPercentage,
      status: getDeltaStatus(deltaPercentage),
    };
  }

  // Insert the price
  const { data, error } = await supabase
    .from('prices')
    .insert({
      user_id: userId,
      zone_id: submission.zone_id,
      city: submission.city,
      category: submission.category,
      amount: submission.amount,
      currency: submission.currency,
      notes: submission.notes,
      zone_median_at_submission: stats?.median || null,
      delta_percentage: deltaPercentage,
    } as any)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to submit price: ${error.message}`);
  }

  return {
    priceId: (data as any).id,
    delta,
  };
}

/**
 * Get price statistics for a zone and category
 */
export async function getZonePriceStats(
  zoneId: string,
  city: string,
  category: string
): Promise<ZonePriceStats | null> {
  const supabase = createServiceClient();

  // Get prices from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('prices')
    .select('amount, currency, created_at')
    .eq('zone_id', zoneId)
    .eq('city', city)
    .eq('category', category)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('amount', { ascending: true });

  if (error || !data || data.length === 0) {
    return null;
  }

  const priceData = data as Array<{ amount: number; currency: string; created_at: string }>;
  const amounts = priceData.map((p) => p.amount);
  const median = calculateMedian(amounts);
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  return {
    category,
    median,
    average,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    sample_count: amounts.length,
    currency: priceData[0].currency,
    last_updated: priceData[priceData.length - 1].created_at,
  };
}

/**
 * Get all price stats for a zone
 */
export async function getAllZonePriceStats(
  zoneId: string,
  city: string
): Promise<ZonePriceStats[]> {
  const categories = [
    'meal_cheap',
    'meal_mid',
    'coffee',
    'beer',
    'water_bottle',
    'transit_single',
  ];

  const stats: ZonePriceStats[] = [];

  for (const category of categories) {
    const stat = await getZonePriceStats(zoneId, city, category);
    if (stat) {
      stats.push(stat);
    }
  }

  return stats;
}

/**
 * Get delta status from percentage
 */
function getDeltaStatus(deltaPercentage: number): PriceDelta['status'] {
  if (deltaPercentage <= DELTA_THRESHOLDS.BARGAIN) {
    return 'BARGAIN';
  }
  if (deltaPercentage <= DELTA_THRESHOLDS.NORMAL_HIGH) {
    return 'NORMAL';
  }
  if (deltaPercentage <= DELTA_THRESHOLDS.OVERPRICED) {
    return 'HIGH';
  }
  return 'OVERPRICED';
}

/**
 * Calculate median of an array
 */
function calculateMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Generate price delta message for HUD
 */
export function formatPriceDeltaMessage(delta: PriceDelta): string {
  const sign = delta.delta_percentage >= 0 ? '+' : '';
  const percentage = Math.round(delta.delta_percentage);

  switch (delta.status) {
    case 'BARGAIN':
      return `PRICE INTEL: ${sign}${percentage}% // BELOW MEDIAN // FAVORABLE`;
    case 'NORMAL':
      return `PRICE INTEL: ${sign}${percentage}% // WITHIN NORMAL RANGE`;
    case 'HIGH':
      return `PRICE ALERT: ${sign}${percentage}% // ABOVE MEDIAN // VERIFY`;
    case 'OVERPRICED':
      return `⚠️ OVERPRICING DETECTED: ${sign}${percentage}% // CONSIDER ALTERNATIVES`;
    default:
      return `PRICE DELTA: ${sign}${percentage}%`;
  }
}

/**
 * Check if a zone has potential overpricing issues
 */
export async function checkZoneOverpricing(
  zoneId: string,
  city: string
): Promise<{ hasIssues: boolean; categories: string[] }> {
  const supabase = createServiceClient();

  // Get recent prices with high deltas
  const { data } = await supabase
    .from('prices')
    .select('category, delta_percentage')
    .eq('zone_id', zoneId)
    .eq('city', city)
    .gte('delta_percentage', DELTA_THRESHOLDS.OVERPRICED)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!data || data.length === 0) {
    return { hasIssues: false, categories: [] };
  }

  const priceData = data as Array<{ category: string; delta_percentage: number | null }>;
  const categories = [...new Set(priceData.map((p) => p.category))];

  return {
    hasIssues: categories.length > 0,
    categories,
  };
}
