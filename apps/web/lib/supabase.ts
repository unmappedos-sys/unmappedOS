import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ReportCategory =
  | 'OBSTRUCTION'
  | 'CROWD_SURGE'
  | 'CLOSED'
  | 'DATA_ANOMALY'
  | 'AGGRESSIVE_TOUTING'
  | 'CONFUSING_TRANSIT'
  | 'OVERPRICING';

export interface Report {
  id: string;
  user_id: string;
  zone_id: string;
  city: string;
  category: ReportCategory;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Price {
  id: string;
  user_id: string | null;
  zone_id: string;
  city: string;
  item: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  provider: string;
  karma: number;
  created_at: string;
}

export async function submitReport(data: {
  zoneId: string;
  city: string;
  category: ReportCategory;
  metadata?: Record<string, unknown>;
}) {
  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      zone_id: data.zoneId,
      city: data.city,
      category: data.category,
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}

export async function submitPrice(data: {
  zoneId: string;
  city: string;
  item: string;
  amount: number;
  currency: string;
}) {
  const { data: price, error } = await supabase
    .from('prices')
    .insert({
      zone_id: data.zoneId,
      city: data.city,
      item: data.item,
      amount: data.amount,
      currency: data.currency,
    })
    .select()
    .single();

  if (error) throw error;
  return price;
}

export async function getUserKarma(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('karma')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data?.karma || 0;
}

export async function incrementKarma(userId: string, delta: number, reason: string) {
  // Insert karma log
  await supabase.from('karma_logs').insert({
    user_id: userId,
    delta,
    reason,
  });

  // Update user karma
  const { data: user } = await supabase
    .from('users')
    .select('karma')
    .eq('id', userId)
    .single();

  const newKarma = (user?.karma || 0) + delta;

  await supabase.from('users').update({ karma: newKarma }).eq('id', userId);

  return newKarma;
}
