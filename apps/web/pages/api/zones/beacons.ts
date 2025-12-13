/**
 * API: Ghost Beacons
 * 
 * Get ghost beacons for a zone.
 */

import { createApiHandler } from '@/lib/apiHandler';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabaseService';

const querySchema = z.object({
  zone_id: z.string().min(1),
  city: z.string().min(1),
});

export default createApiHandler({
  GET: async (ctx) => {
    const validated = querySchema.parse(ctx.req.query);
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('ghost_beacons')
      .select('*')
      .eq('zone_id', validated.zone_id)
      .eq('city', validated.city);

    if (error) {
      ctx.req.log.error({ error }, 'Failed to fetch ghost beacons');
      return { beacons: [] };
    }

    return {
      beacons: data || [],
      count: data?.length || 0,
    };
  },
});
