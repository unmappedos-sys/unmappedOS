/**
 * Comments API - Submit structured intel with gamification
 * Implements structured comments with validation, rate limiting, anonymization, and activity logging
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getUserOr401, createServiceClient } from '../../lib/supabaseServer';
import { logActivity, ACTION_TYPES } from '../../lib/activityLogger';
import { awardKarma, evaluateQuests, getKarmaForAction } from '../../lib/gamify';
import { createRequestLogger } from '../../lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Valid short tags
const SHORT_TAGS = [
  'CONSTRUCTION',
  'CROWD_SURGE',
  'OVERPRICING',
  'HASSLE',
  'SAFETY_OBSERVED',
  'GOOD_FOR_DAY',
  'GOOD_FOR_NIGHT',
  'CLEAN',
  'TOILET_AVAILABLE',
  'ACCESS_ISSUE',
] as const;

// Validation schema
const CommentSchema = z.object({
  zone_id: z.string().uuid(),
  city: z.string().min(1).max(50),
  short_tag: z.enum(SHORT_TAGS),
  note: z.string().min(1).max(240),
  price: z.number().positive().optional(),
  photo_url: z.string().url().optional(),
  anonymous: z.boolean().optional(),
  user_id: z.string().optional(),
  // BURN AFTER READING - Ephemeral intel
  flash_intel: z.boolean().optional(), // If true, expires after TTL
  ttl_hours: z.number().min(1).max(24).optional(), // Time to live (1-24 hours)
});

type CommentInput = z.infer<typeof CommentSchema>;

// Rate limiting map (in-memory, use Redis in production)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 12 * 60 * 60 * 1000; // 12 hours

// Banned tokens (URLs, phone numbers)
const BANNED_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone numbers
  /@[\w]+\.[\w]+/i, // Email-like patterns
];

function containsBannedContent(text: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

function hashIP(ip: string): string {
  // Simple hash for rate limiting (use proper hashing in production)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse and validate input
    const validation = CommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data: CommentInput = validation.data;

    // Check for banned content
    if (containsBannedContent(data.note)) {
      return res.status(400).json({
        error: 'Comment contains prohibited content (URLs, phone numbers, etc.)',
      });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = hashIP(clientIP as string);
    const rateLimitKey = `${ipHash}:${data.zone_id}`;
    const lastSubmission = rateLimitMap.get(rateLimitKey);

    if (lastSubmission && Date.now() - lastSubmission < RATE_LIMIT_WINDOW) {
      const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - lastSubmission)) / 1000 / 60);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You can submit one comment per zone every 12 hours. Try again in ${remainingTime} minutes.`,
      });
    }

    // Get authenticated user
    let user;
    try {
      user = await getUserOr401(req);
    } catch (error) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const reqLogger = createRequestLogger(req);
    reqLogger.info('COMMENT_CREATE', {
      user_id: user.id,
      zone_id: data.zone_id,
      city: data.city,
    });

    // Initialize Supabase with service role
    const supabase = createServiceClient();

    // Determine user hash (for anonymization)
    const userHash = data.anonymous ? null : data.user_id || ipHash;

    // Calculate expiration for flash intel
    let expiresAt = null;
    if (data.flash_intel) {
      const ttlHours = data.ttl_hours || 4; // Default 4 hours
      expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        zone_id: data.zone_id,
        city: data.city,
        comment_text: data.note,
        verified: false,
        flash_intel: data.flash_intel || false,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      reqLogger.error('COMMENT_INSERT_FAILED', { error: insertError });
      return res.status(500).json({ error: 'Failed to save comment' });
    }

    // Update rate limit
    rateLimitMap.set(rateLimitKey, Date.now());

    // Log activity
    await logActivity({
      user_id: user.id,
      action_type: ACTION_TYPES.COMMENT_CREATE,
      payload: {
        comment_id: comment.id,
        zone_id: data.zone_id,
        city: data.city,
      },
      metadata: { anonymous: data.anonymous || false },
    });

    // Award karma
    const karmaAmount = getKarmaForAction(ACTION_TYPES.COMMENT_CREATE);
    await awardKarma(user.id, karmaAmount, 'Comment submitted');

    // Evaluate quests
    const unlockedBadges = await evaluateQuests(user.id);

    reqLogger.info('COMMENT_SUCCESS', {
      comment_id: comment.id,
      karma_awarded: karmaAmount,
      badges_unlocked: unlockedBadges.length,
      flash_intel: data.flash_intel || false,
    });

    const responseMessage = data.flash_intel
      ? `FLASH INTEL LOGGED // BURNS IN ${data.ttl_hours || 4} HOURS`
      : 'INTEL LOGGED // FIELD UPDATE RECORDED';

    return res.status(201).json({
      success: true,
      comment_id: comment.id,
      message: responseMessage,
      karma_awarded: karmaAmount,
      badges_unlocked: unlockedBadges,
      flash_intel: data.flash_intel || false,
      expires_at: expiresAt,
    });
  } catch (error) {
    const reqLogger = createRequestLogger(req);
    reqLogger.error('COMMENT_ERROR', { error });
    return res.status(500).json({ error: 'Internal server error' });

  }
}
