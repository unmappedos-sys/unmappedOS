/**
 * Supabase Browser Client
 * 
 * Used for client-side operations (React components, client-side auth).
 * This client uses the anon key which is safe to expose to the browser.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
