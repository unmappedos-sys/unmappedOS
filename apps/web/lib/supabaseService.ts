/**
 * Supabase Service Client
 * 
 * Used for server-side operations that require elevated privileges.
 * Uses the service role key - NEVER expose to client.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Create a Supabase client with service role privileges
 * Use this for:
 * - Background jobs
 * - Admin operations  
 * - Bypassing RLS policies
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service configuration');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Execute a database function with service role
 */
export async function executeServiceRpc<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<T> {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase.rpc(functionName as any, params as any);
  
  if (error) {
    throw new Error(`RPC ${functionName} failed: ${error.message}`);
  }
  
  return data as T;
}
