/**
 * API: Whispers
 * 
 * Generate and retrieve mission whispers for a zone.
 */

import { createApiHandler } from '@/lib/apiHandler';
import { generateWhispers, getTimeOfDay } from '@/lib/whisperEngine';
import { z } from 'zod';

const querySchema = z.object({
  zone_id: z.string().min(1),
  city: z.string().min(1),
});

export default createApiHandler({
  GET: async (ctx) => {
    const validated = querySchema.parse(ctx.req.query);

    const whispers = await generateWhispers({
      zone_id: validated.zone_id,
      city: validated.city,
      time_of_day: getTimeOfDay(),
      day_of_week: new Date().getDay(),
    });

    return {
      whispers,
      generated_at: new Date().toISOString(),
    };
  },
});
