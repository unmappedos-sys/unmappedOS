/**
 * Intel Submission API
 * 
 * Accepts structured user intel (not reviews):
 * - PRICE_SUBMISSION
 * - HASSLE_REPORT
 * - CONSTRUCTION
 * - CROWD_SURGE
 * - QUIET_CONFIRMED
 * - HAZARD_REPORT
 * - VERIFICATION
 * 
 * Each submission:
 * - Validates via Zod
 * - Rate limits by user
 * - Trust-weights by karma
 * - Updates zone confidence
 * - Awards karma
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  calculateConfidenceUpdate,
  ZoneConfidenceState,
  IntelSubmission,
  IntelType,
  CONFIDENCE_CONFIG,
} from '@/lib/intel/confidenceEngine';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const IntelTypeSchema = z.enum([
  'PRICE_SUBMISSION',
  'HASSLE_REPORT',
  'CONSTRUCTION',
  'CROWD_SURGE',
  'QUIET_CONFIRMED',
  'HAZARD_REPORT',
  'VERIFICATION',
]);

const PriceDataSchema = z.object({
  item: z.enum(['coffee', 'beer', 'meal_street', 'meal_restaurant', 'transport']),
  price: z.number().positive().max(100000),
  currency: z.string().length(3).or(z.string().max(5)),
  is_tourist_price: z.boolean().optional(),
  venue_name: z.string().max(100).optional(),
});

const HassleDataSchema = z.object({
  hassle_type: z.enum(['SCAM', 'OVERCHARGE', 'AGGRESSIVE_VENDOR', 'TAXI_REFUSAL', 'OTHER']),
  description: z.string().max(500).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

const ConstructionDataSchema = z.object({
  impact: z.enum(['MINOR', 'PARTIAL_CLOSURE', 'FULL_CLOSURE']),
  description: z.string().max(300).optional(),
  estimated_end: z.string().datetime().optional(),
});

const CrowdDataSchema = z.object({
  level: z.enum(['EMPTY', 'LIGHT', 'MODERATE', 'CROWDED', 'PACKED']),
  wait_time_minutes: z.number().min(0).max(300).optional(),
});

const HazardDataSchema = z.object({
  hazard_type: z.enum(['UNSAFE', 'CLOSED', 'NATURAL_DISASTER', 'CIVIL_UNREST', 'OTHER']),
  description: z.string().max(500),
  severity: z.enum(['ADVISORY', 'WARNING', 'DANGER']),
});

const VerificationDataSchema = z.object({
  status: z.enum(['CONFIRMED_ACCURATE', 'MINOR_CHANGES', 'SIGNIFICANT_CHANGES', 'INCORRECT']),
  notes: z.string().max(500).optional(),
});

const IntelSubmissionSchema = z.object({
  zone_id: z.string().min(1).max(100),
  type: IntelTypeSchema,
  data: z.union([
    PriceDataSchema,
    HassleDataSchema,
    ConstructionDataSchema,
    CrowdDataSchema,
    HazardDataSchema,
    VerificationDataSchema,
    z.object({}), // For QUIET_CONFIRMED with no extra data
  ]),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }).optional(),
});

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMITS: Record<IntelType, { max: number; window_hours: number }> = {
  PRICE_SUBMISSION: { max: 20, window_hours: 24 },
  HASSLE_REPORT: { max: 10, window_hours: 24 },
  CONSTRUCTION: { max: 5, window_hours: 24 },
  CROWD_SURGE: { max: 10, window_hours: 1 },
  QUIET_CONFIRMED: { max: 10, window_hours: 24 },
  HAZARD_REPORT: { max: 3, window_hours: 24 },
  VERIFICATION: { max: 20, window_hours: 24 },
};

async function checkRateLimit(
  userId: string,
  intelType: IntelType
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limit = RATE_LIMITS[intelType];
  const windowStart = new Date(Date.now() - limit.window_hours * 60 * 60 * 1000);
  
  const { count } = await supabase
    .from('zone_intel')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('intel_type', intelType)
    .gte('created_at', windowStart.toISOString());
  
  const used = count || 0;
  const remaining = Math.max(0, limit.max - used);
  const resetAt = new Date(Date.now() + limit.window_hours * 60 * 60 * 1000);
  
  return {
    allowed: used < limit.max,
    remaining,
    resetAt,
  };
}

// ============================================================================
// KARMA & TRUST
// ============================================================================

const KARMA_REWARDS: Record<IntelType, number> = {
  PRICE_SUBMISSION: 5,
  HASSLE_REPORT: 10,
  CONSTRUCTION: 8,
  CROWD_SURGE: 3,
  QUIET_CONFIRMED: 3,
  HAZARD_REPORT: 15,
  VERIFICATION: 10,
};

async function getUserTrustWeight(userId: string): Promise<number> {
  const { data: user } = await supabase
    .from('users')
    .select('karma, trust_level')
    .eq('id', userId)
    .single();
  
  if (!user) return CONFIDENCE_CONFIG.MIN_TRUST_WEIGHT;
  
  // Base trust on karma
  const karma = user.karma || 0;
  
  if (karma < 0) return CONFIDENCE_CONFIG.MIN_TRUST_WEIGHT;
  if (karma < 50) return 0.5;
  if (karma < 200) return 0.8;
  if (karma < 500) return 1.0;
  if (karma < 1000) return 1.2;
  return CONFIDENCE_CONFIG.MAX_TRUST_WEIGHT;
}

async function awardKarma(userId: string, intelType: IntelType): Promise<void> {
  const reward = KARMA_REWARDS[intelType];
  
  await supabase.rpc('increment_karma', {
    user_id: userId,
    amount: reward,
  });
}

// ============================================================================
// ZONE CONFIDENCE UPDATE
// ============================================================================

async function getZoneConfidenceState(zoneId: string): Promise<ZoneConfidenceState | null> {
  const { data } = await supabase
    .from('zone_confidence')
    .select('*')
    .eq('zone_id', zoneId)
    .single();
  
  if (!data) return null;
  
  return {
    zone_id: data.zone_id,
    score: data.score,
    level: data.level,
    state: data.state,
    last_verified_at: data.last_verified_at,
    last_intel_at: data.last_intel_at,
    verification_count: data.verification_count,
    intel_count_24h: data.intel_count_24h,
    conflict_count: data.conflict_count,
    hazard_active: data.hazard_active,
    hazard_expires_at: data.hazard_expires_at,
    anomaly_detected: data.anomaly_detected,
    anomaly_reason: data.anomaly_reason,
    updated_at: data.updated_at,
  };
}

async function getRecentIntel(zoneId: string, hours: number = 24): Promise<IntelSubmission[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('zone_intel')
    .select('*')
    .eq('zone_id', zoneId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  
  return (data || []).map(row => ({
    id: row.id,
    zone_id: row.zone_id,
    user_id: row.user_id,
    type: row.intel_type as IntelType,
    data: row.data,
    trust_weight: row.trust_weight,
    created_at: row.created_at,
  }));
}

async function countHazardReports24h(zoneId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from('zone_intel')
    .select('*', { count: 'exact', head: true })
    .eq('zone_id', zoneId)
    .eq('intel_type', 'HAZARD_REPORT')
    .gte('created_at', since);
  
  return count || 0;
}

async function checkPriceAnomaly(
  zoneId: string,
  newPrice: number,
  item: string
): Promise<boolean> {
  const { data } = await supabase
    .from('zone_prices')
    .select('average_price, report_count')
    .eq('zone_id', zoneId)
    .eq('item', item)
    .single();
  
  if (!data || data.report_count < 3) return false;
  
  const deviation = Math.abs(newPrice - data.average_price) / data.average_price;
  return deviation > CONFIDENCE_CONFIG.PRICE_ANOMALY_THRESHOLD;
}

async function updateZoneConfidence(
  zoneId: string,
  newState: ZoneConfidenceState
): Promise<void> {
  await supabase
    .from('zone_confidence')
    .upsert({
      zone_id: zoneId,
      score: newState.score,
      level: newState.level,
      state: newState.state,
      last_verified_at: newState.last_verified_at,
      last_intel_at: newState.last_intel_at,
      verification_count: newState.verification_count,
      intel_count_24h: newState.intel_count_24h,
      conflict_count: newState.conflict_count,
      hazard_active: newState.hazard_active,
      hazard_expires_at: newState.hazard_expires_at,
      anomaly_detected: newState.anomaly_detected,
      anomaly_reason: newState.anomaly_reason,
      updated_at: newState.updated_at,
    }, { onConflict: 'zone_id' });
}

// ============================================================================
// API HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = session.user.id;

    // 2. Validate input
    const validation = IntelSubmissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid submission',
        details: validation.error.errors,
      });
    }
    const { zone_id, type, data, location } = validation.data;

    // 3. Check rate limit
    const rateLimit = await checkRateLimit(userId, type as IntelType);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        reset_at: rateLimit.resetAt.toISOString(),
      });
    }

    // 4. Get user trust weight
    const trustWeight = await getUserTrustWeight(userId);

    // 5. Store intel submission
    const { data: intelRow, error: insertError } = await supabase
      .from('zone_intel')
      .insert({
        zone_id,
        user_id: userId,
        intel_type: type,
        data,
        trust_weight: trustWeight,
        location: location ? `POINT(${location.lon} ${location.lat})` : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert intel:', insertError);
      return res.status(500).json({ error: 'Failed to save intel' });
    }

    // 6. Update zone confidence
    let confidenceState = await getZoneConfidenceState(zone_id);
    if (!confidenceState) {
      // Initialize confidence for new zone
      confidenceState = {
        zone_id,
        score: 50,
        level: 'MEDIUM',
        state: 'ACTIVE',
        last_verified_at: null,
        last_intel_at: null,
        verification_count: 0,
        intel_count_24h: 0,
        conflict_count: 0,
        hazard_active: false,
        hazard_expires_at: null,
        anomaly_detected: false,
        anomaly_reason: null,
        updated_at: new Date().toISOString(),
      };
    }

    const recentIntel = await getRecentIntel(zone_id);
    const hazardReports = await countHazardReports24h(zone_id);
    
    // Check price anomaly if this is a price submission
    let priceAnomaly = false;
    if (type === 'PRICE_SUBMISSION' && 'price' in data && 'item' in data) {
      priceAnomaly = await checkPriceAnomaly(
        zone_id,
        (data as { price: number; item: string }).price,
        (data as { price: number; item: string }).item
      );
    }

    const intel: IntelSubmission = {
      id: intelRow.id,
      zone_id,
      user_id: userId,
      type: type as IntelType,
      data,
      trust_weight: trustWeight,
      created_at: intelRow.created_at,
    };

    const { newState, factors } = calculateConfidenceUpdate(
      confidenceState,
      intel,
      recentIntel,
      hazardReports,
      priceAnomaly
    );

    await updateZoneConfidence(zone_id, newState);

    // 7. Update price aggregates if price submission
    if (type === 'PRICE_SUBMISSION' && 'price' in data && 'item' in data) {
      const priceData = data as { price: number; item: string; is_tourist_price?: boolean };
      await supabase.rpc('update_zone_price', {
        p_zone_id: zone_id,
        p_item: priceData.item,
        p_price: priceData.price,
        p_is_tourist: priceData.is_tourist_price || false,
      });
    }

    // 8. Award karma
    await awardKarma(userId, type as IntelType);

    // 9. Log activity
    await supabase.from('activity_log').insert({
      user_id: userId,
      action: 'INTEL_SUBMITTED',
      entity_type: 'zone',
      entity_id: zone_id,
      metadata: { intel_type: type, trust_weight: trustWeight },
    });

    // 10. Return response
    return res.status(200).json({
      success: true,
      intel_id: intelRow.id,
      karma_earned: KARMA_REWARDS[type as IntelType],
      zone_confidence: {
        score: newState.score,
        level: newState.level,
        state: newState.state,
        factors,
      },
      rate_limit: {
        remaining: rateLimit.remaining - 1,
        reset_at: rateLimit.resetAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Intel submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
