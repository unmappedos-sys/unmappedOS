/**
 * API: Safe Return Path
 * 
 * Calculate safe extraction routes.
 */

import { createApiHandler, ApiError } from '@/lib/apiHandler';
import { safeReturnRequestSchema } from '@/lib/validation';
import { calculateSafeReturnPath, SafeCorridor } from '@/lib/safeReturnPath';
import { createServiceClient } from '@/lib/supabaseService';

export default createApiHandler(
  {
    POST: async (ctx, body) => {
      const validated = safeReturnRequestSchema.parse(body);
      const supabase = createServiceClient();

      // Get safe corridors for user's current area
      // In production, this would be more sophisticated
      const { data: corridors } = await supabase
        .from('safe_corridors')
        .select('*')
        .limit(20);

      // Get offline zones to avoid
      const { data: offlineZones } = await supabase
        .from('zones')
        .select('zone_id')
        .eq('status', 'OFFLINE');

      const zoneData = offlineZones as Array<{ zone_id: string }> | null;
      const offlineZoneIds = zoneData?.map((z) => z.zone_id) || [];

      const safePath = calculateSafeReturnPath(
        {
          current_location: validated.current_location,
          destination: validated.destination,
          vitality_level: validated.vitality_level || 100,
          time_constraint_minutes: validated.time_constraint_minutes,
          prefer_lit_routes: true,
          avoid_offline_zones: true,
        },
        (corridors || []) as SafeCorridor[],
        offlineZoneIds
      );

      ctx.req.log.info({
        event: 'safe_return_calculated',
        distance_meters: safePath.total_distance_meters,
        warnings_count: safePath.warnings.length,
      });

      return {
        path: safePath,
        calculated_at: new Date().toISOString(),
      };
    },
  },
  { auth: true }
);
