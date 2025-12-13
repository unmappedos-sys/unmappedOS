/**
 * Zod Validation Schemas
 * 
 * Centralized validation for all API inputs.
 * Use these schemas in API routes to validate request bodies.
 */

import { z } from 'zod';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

export const uuidSchema = z.string().uuid();

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2).max(100).optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// =============================================================================
// REPORT SCHEMAS
// =============================================================================

export const reportCategorySchema = z.enum([
  'OBSTRUCTION',
  'HASSLE',
  'OVERPRICING',
  'CROWD_SURGE',
  'CLOSED',
  'DATA_ANOMALY',
  'AGGRESSIVE_TOUTING',
  'CONFUSING_TRANSIT',
  'SAFETY_CONCERN',
]);

export const reportSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const createReportSchema = z.object({
  zone_id: z.string().min(1),
  city: z.string().min(1).max(100),
  category: reportCategorySchema,
  description: z.string().max(1000).optional(),
  severity: reportSeveritySchema.default('medium'),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// PRICE SCHEMAS
// =============================================================================

export const priceCategorySchema = z.enum([
  'meal_cheap',
  'meal_mid',
  'meal_expensive',
  'coffee',
  'beer',
  'water_bottle',
  'transit_single',
  'transit_day_pass',
  'accommodation_budget',
  'accommodation_mid',
  'accommodation_luxury',
  'taxi_base',
  'taxi_airport',
]);

export const submitPriceSchema = z.object({
  zone_id: z.string().min(1),
  city: z.string().min(1).max(100),
  category: priceCategorySchema,
  amount: z.number().positive().max(1000000),
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(500).optional(),
  coordinates: coordinatesSchema.optional(),
});

// =============================================================================
// COMMENT SCHEMAS
// =============================================================================

export const createCommentSchema = z.object({
  zone_id: z.string().min(1),
  city: z.string().min(1).max(100),
  comment_text: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// ZONE SCHEMAS
// =============================================================================

export const zoneStatusSchema = z.enum(['ACTIVE', 'OFFLINE', 'CAUTION']);

export const updateZoneStatusSchema = z.object({
  zone_id: z.string().min(1),
  status: zoneStatusSchema,
  reason: z.string().max(500).optional(),
});

// =============================================================================
// ACTIVITY SCHEMAS
// =============================================================================

export const activityTypeSchema = z.enum([
  'zone_enter',
  'zone_exit',
  'anchor_reached',
  'price_submitted',
  'report_submitted',
  'comment_added',
  'quest_completed',
  'badge_unlocked',
  'pack_downloaded',
  'crisis_activated',
  'crisis_deactivated',
]);

export const logActivitySchema = z.object({
  action_type: activityTypeSchema,
  payload: z.record(z.unknown()).default({}),
  zone_id: z.string().optional(),
  city: z.string().optional(),
});

// =============================================================================
// QUEST SCHEMAS
// =============================================================================

export const questStatusSchema = z.enum(['active', 'completed', 'failed', 'expired']);

export const updateQuestProgressSchema = z.object({
  quest_id: z.string().min(1),
  progress: z.record(z.unknown()),
  status: questStatusSchema.optional(),
});

// =============================================================================
// FINGERPRINT SCHEMAS
// =============================================================================

export const updateFingerprintSchema = z.object({
  texture_preferences: z.record(z.number()).optional(),
  time_preferences: z.record(z.number()).optional(),
  activity_patterns: z.record(z.unknown()).optional(),
});

// =============================================================================
// PACK SCHEMAS
// =============================================================================

export const downloadPackSchema = z.object({
  city: z.string().min(1).max(100),
  version: z.string().optional(),
});

// =============================================================================
// NAVIGATION SCHEMAS
// =============================================================================

export const safeReturnRequestSchema = z.object({
  current_location: coordinatesSchema,
  destination: coordinatesSchema.optional(),
  vitality_level: z.number().min(0).max(100).optional(),
  time_constraint_minutes: z.number().positive().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate request body against a schema
 * Returns parsed data or throws validation error
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    
    throw new ValidationError('Validation failed', errors);
  }
  
  return result.data;
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T extends z.ZodSchema>(
  schema: T,
  query: unknown
): z.infer<T> {
  return validateBody(schema, query);
}

/**
 * Custom validation error with field-level details
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string }>;
  
  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type SubmitPriceInput = z.infer<typeof submitPriceSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type LogActivityInput = z.infer<typeof logActivitySchema>;
export type UpdateQuestProgressInput = z.infer<typeof updateQuestProgressSchema>;
export type SafeReturnRequestInput = z.infer<typeof safeReturnRequestSchema>;
