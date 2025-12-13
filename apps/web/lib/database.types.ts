/**
 * Supabase Database Types
 * 
 * Generated types for the database schema.
 * Update these when schema changes via: npx supabase gen types typescript --project-id <project-id>
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          callsign: string | null;
          provider: string;
          karma: number;
          level: number;
          streak: number;
          city: string | null;
          fingerprint: Json | null;
          created_at: string;
          last_active: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          email: string;
          callsign?: string | null;
          provider?: string;
          karma?: number;
          level?: number;
          streak?: number;
          city?: string | null;
          fingerprint?: Json | null;
          created_at?: string;
          last_active?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          email?: string;
          callsign?: string | null;
          provider?: string;
          karma?: number;
          level?: number;
          streak?: number;
          city?: string | null;
          fingerprint?: Json | null;
          created_at?: string;
          last_active?: string | null;
          metadata?: Json | null;
        };
      };
      zones: {
        Row: {
          id: string;
          zone_id: string;
          city: string;
          name: string;
          geometry: Json;
          metadata: Json;
          clearance_level: number;
          status: string;
          status_reason: string | null;
          texture_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          zone_id?: string;
          city: string;
          name: string;
          geometry: Json;
          metadata?: Json;
          clearance_level?: number;
          status?: string;
          status_reason?: string | null;
          texture_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          zone_id?: string;
          city?: string;
          name?: string;
          geometry?: Json;
          metadata?: Json;
          clearance_level?: number;
          status?: string;
          status_reason?: string | null;
          texture_type?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          zone_id: string;
          city: string;
          category: string;
          metadata: Json;
          created_at: string;
          trust_score: number;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          zone_id: string;
          city: string;
          category: string;
          metadata?: Json;
          created_at?: string;
          trust_score?: number;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          zone_id?: string;
          city?: string;
          category?: string;
          metadata?: Json;
          created_at?: string;
          trust_score?: number;
          status?: string;
        };
      };
      prices: {
        Row: {
          id: string;
          user_id: string;
          zone_id: string;
          city: string;
          category: string;
          amount: number;
          currency: string;
          notes: string | null;
          zone_median_at_submission: number | null;
          delta_percentage: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          zone_id: string;
          city: string;
          category: string;
          amount: number;
          currency?: string;
          notes?: string | null;
          zone_median_at_submission?: number | null;
          delta_percentage?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          zone_id?: string;
          city?: string;
          category?: string;
          amount?: number;
          currency?: string;
          notes?: string | null;
          zone_median_at_submission?: number | null;
          delta_percentage?: number | null;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          payload?: Json;
          created_at?: string;
        };
      };
      crisis_events: {
        Row: {
          id: string;
          user_id: string;
          trigger_type: string;
          city: string | null;
          location_coarse: Json | null;
          resolved: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trigger_type: string;
          city?: string | null;
          location_coarse?: Json | null;
          resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trigger_type?: string;
          city?: string | null;
          location_coarse?: Json | null;
          resolved?: boolean;
          resolved_at?: string | null;
          created_at?: string;
        };
      };
      quests: {
        Row: {
          id: string;
          name: string;
          description: string;
          city: string | null;
          requirements: Json;
          karma_reward: number;
          badge_id: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          city?: string | null;
          requirements?: Json;
          karma_reward?: number;
          badge_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          city?: string | null;
          requirements?: Json;
          karma_reward?: number;
          badge_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      user_quests: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string;
          status: string;
          progress: Json;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_id: string;
          status?: string;
          progress?: Json;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_id?: string;
          status?: string;
          progress?: Json;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      whisper_cache: {
        Row: {
          id: string;
          zone_id: string;
          city: string;
          whisper_text: string;
          whisper_type: string;
          confidence: number;
          valid_until: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          zone_id: string;
          city: string;
          whisper_text: string;
          whisper_type: string;
          confidence?: number;
          valid_until: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          zone_id?: string;
          city?: string;
          whisper_text?: string;
          whisper_type?: string;
          confidence?: number;
          valid_until?: string;
          created_at?: string;
        };
      };
      offline_zones: {
        Row: {
          id: string;
          user_id: string;
          zone_id: string;
          city: string;
          downloaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          zone_id: string;
          city: string;
          downloaded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          zone_id?: string;
          city?: string;
          downloaded_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          rarity: string;
          requirements: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          icon?: string;
          category?: string;
          rarity?: string;
          requirements?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          category?: string;
          rarity?: string;
          requirements?: Json;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          awarded_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Helper types for table rows
export type UserRow = Database['public']['Tables']['users']['Row'];
export type ZoneRow = Database['public']['Tables']['zones']['Row'];
export type PriceRow = Database['public']['Tables']['prices']['Row'];
export type QuestRow = Database['public']['Tables']['quests']['Row'];
export type UserQuestRow = Database['public']['Tables']['user_quests']['Row'];
export type WhisperCacheRow = Database['public']['Tables']['whisper_cache']['Row'];
export type CrisisEventRow = Database['public']['Tables']['crisis_events']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type OfflineZoneRow = Database['public']['Tables']['offline_zones']['Row'];
export type BadgeRow = Database['public']['Tables']['badges']['Row'];
export type UserBadgeRow = Database['public']['Tables']['user_badges']['Row'];

