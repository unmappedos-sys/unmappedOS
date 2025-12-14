/**
 * Operative Dossier Page
 *
 * Personal profile showing quests, badges, fingerprint, and activity.
 */

import { useMemo, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabaseClient';

interface Quest {
  id: string;
  name: string;
  description: string;
  quest_type: string;
  criteria: Record<string, any>;
  karma_reward: number;
  progress?: Record<string, any>;
  status?: 'active' | 'completed' | 'failed';
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at?: string;
}

interface UserProfile {
  karma: number;
  level: number;
  streak: number;
  total_intel: number;
  fingerprint: {
    texture_preferences: Record<string, number>;
    time_preferences: Record<string, number>;
  };
}

export default function DossierPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quests' | 'badges' | 'fingerprint' | 'activity'>(
    'quests'
  );

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (user && supabase) {
      loadDossier();
    }
  }, [user, supabase]);

  const loadDossier = async () => {
    if (!user || !supabase) return;
    setLoading(true);

    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('karma, level, streak, total_intel, fingerprint')
        .eq('id', user.id)
        .single();

      if (userData) {
        setProfile(userData as UserProfile);
      }

      // Load active quests
      const { data: questData } = await supabase.from('quests').select('*').eq('active', true);

      // Load user quest progress
      const { data: userQuests } = await supabase
        .from('user_quests')
        .select('quest_id, status, progress')
        .eq('user_id', user.id);

      if (questData) {
        const quests = questData as Array<{ id: string; [key: string]: any }>;
        const userQuestData = userQuests as Array<{
          quest_id: string;
          status: string;
          progress: any;
        }> | null;
        const questsWithProgress = quests.map((q) => {
          const userQuest = userQuestData?.find((uq) => uq.quest_id === q.id);
          return {
            ...q,
            progress: userQuest?.progress || {},
            status: userQuest?.status || 'active',
          };
        });
        setQuests(questsWithProgress as Quest[]);
      }

      // Load user badges
      const { data: badgeData } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_at, badges(id, name, description, icon, rarity)')
        .eq('user_id', user.id);

      if (badgeData) {
        setBadges(
          badgeData.map((b: any) => ({
            ...b.badges,
            unlocked_at: b.unlocked_at,
          }))
        );
      }

      // Load recent activity
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('action_type, payload, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activityData) {
        setActivities(activityData);
      }
    } catch (error) {
      console.error('Failed to load dossier:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-ops-night flex items-center justify-center">
        <div className="text-ops-neon-green font-mono animate-pulse">LOADING DOSSIER...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-ops-night flex items-center justify-center">
        <div className="text-center">
          <p className="text-ops-night-text font-mono mb-4">AUTHENTICATION REQUIRED</p>
          <Link href="/login" className="text-ops-neon-green hover:underline">
            LOGIN
          </Link>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-ops-night text-ops-night-text font-mono">
        <header className="border-b border-ops-neon-green/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/operative" className="text-ops-neon-green hover:underline">
                ← BACK
              </Link>
              <h1 className="font-tactical text-tactical-lg text-ops-neon-green tracking-wider">
                OPERATIVE DOSSIER
              </h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="border border-ops-neon-amber/40 bg-ops-night-surface/60 p-4">
            <p className="text-ops-neon-amber mb-2">BACKEND NOT CONFIGURED</p>
            <p className="text-ops-night-text-dim text-sm leading-relaxed">
              Operative features (quests, badges, activity, reports) require Supabase. Configure
              NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable this.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>OPERATIVE DOSSIER - UNMAPPED OS</title>
      </Head>

      <div className="min-h-screen bg-ops-night text-ops-night-text font-mono">
        {/* Header */}
        <header className="border-b border-ops-neon-green/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/operative" className="text-ops-neon-green hover:underline">
                ← BACK
              </Link>
              <h1 className="font-tactical text-tactical-lg text-ops-neon-green tracking-wider">
                OPERATIVE DOSSIER
              </h1>
            </div>
          </div>
        </header>

        {/* Profile Stats */}
        {profile && (
          <div className="p-4 border-b border-ops-neon-green/30">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-ops-night-surface border border-ops-neon-green/30">
                <p className="text-3xl font-bold text-ops-neon-green">{profile.level}</p>
                <p className="text-xs text-ops-night-text-dim uppercase">Level</p>
              </div>
              <div className="text-center p-4 bg-ops-night-surface border border-ops-neon-amber/30">
                <p className="text-3xl font-bold text-ops-neon-amber">{profile.karma}</p>
                <p className="text-xs text-ops-night-text-dim uppercase">Karma</p>
              </div>
              <div className="text-center p-4 bg-ops-night-surface border border-ops-neon-red/30">
                <p className="text-3xl font-bold text-ops-neon-red">{profile.streak}🔥</p>
                <p className="text-xs text-ops-night-text-dim uppercase">Streak</p>
              </div>
              <div className="text-center p-4 bg-ops-night-surface border border-ops-neon-cyan/30">
                <p className="text-3xl font-bold text-ops-neon-cyan">{profile.total_intel}</p>
                <p className="text-xs text-ops-night-text-dim uppercase">Intel</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-ops-neon-green/30">
          <div className="flex">
            {(['quests', 'badges', 'fingerprint', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-3 text-sm uppercase tracking-wider transition-colors
                  ${
                    activeTab === tab
                      ? 'text-ops-neon-green border-b-2 border-ops-neon-green'
                      : 'text-ops-night-text-dim hover:text-ops-night-text'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <main className="p-6">
          {activeTab === 'quests' && <QuestsTab quests={quests} />}
          {activeTab === 'badges' && <BadgesTab badges={badges} />}
          {activeTab === 'fingerprint' && profile && (
            <FingerprintTab fingerprint={profile.fingerprint} />
          )}
          {activeTab === 'activity' && <ActivityTab activities={activities} />}
        </main>
      </div>
    </>
  );
}

function QuestsTab({ quests }: { quests: Quest[] }) {
  const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
  const weeklyQuests = quests.filter((q) => q.quest_type === 'weekly');
  const achievements = quests.filter((q) => q.quest_type === 'achievement');

  return (
    <div className="space-y-6">
      {/* Daily */}
      <QuestSection title="DAILY MISSIONS" quests={dailyQuests} />

      {/* Weekly */}
      <QuestSection title="WEEKLY OBJECTIVES" quests={weeklyQuests} />

      {/* Achievements */}
      <QuestSection title="ACHIEVEMENTS" quests={achievements} />
    </div>
  );
}

function QuestSection({ title, quests }: { title: string; quests: Quest[] }) {
  if (quests.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm text-ops-night-text-dim uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`
              p-4 border
              ${
                quest.status === 'completed'
                  ? 'border-ops-neon-green/50 bg-ops-neon-green/5'
                  : 'border-ops-neon-green/30'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{quest.name}</p>
                <p className="text-xs text-ops-night-text-dim">{quest.description}</p>
              </div>
              <div className="text-right">
                <p className="text-ops-neon-amber">+{quest.karma_reward} KARMA</p>
                <p className="text-xs text-ops-night-text-dim">
                  {quest.status === 'completed' ? '✓ COMPLETE' : 'IN PROGRESS'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgesTab({ badges }: { badges: Badge[] }) {
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const sortedBadges = [...badges].sort(
    (a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity)
  );

  const rarityColors: Record<string, string> = {
    common: 'border-gray-500',
    uncommon: 'border-ops-neon-green',
    rare: 'border-ops-neon-cyan',
    epic: 'border-ops-neon-purple',
    legendary: 'border-ops-neon-amber',
  };

  return (
    <div>
      <p className="text-sm text-ops-night-text-dim mb-4">{badges.length} BADGES UNLOCKED</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sortedBadges.map((badge) => (
          <div
            key={badge.id}
            className={`
              p-4 bg-ops-night-surface border-2 text-center
              ${rarityColors[badge.rarity] || 'border-gray-500'}
            `}
          >
            <span className="text-4xl">{badge.icon}</span>
            <p className="font-bold mt-2">{badge.name}</p>
            <p className="text-xs text-ops-night-text-dim">{badge.description}</p>
            <p className="text-xs text-ops-night-text-dim mt-2 uppercase">{badge.rarity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FingerprintTab({ fingerprint }: { fingerprint: UserProfile['fingerprint'] }) {
  const texturePrefs = Object.entries(fingerprint?.texture_preferences || {});
  const timePrefs = Object.entries(fingerprint?.time_preferences || {});

  return (
    <div className="space-y-6">
      {/* Texture Preferences */}
      <div>
        <h3 className="text-sm text-ops-night-text-dim uppercase tracking-wider mb-3">
          TEXTURE FINGERPRINT
        </h3>
        {texturePrefs.length === 0 ? (
          <p className="text-ops-night-text-dim">
            No data yet. Explore more zones to build your fingerprint.
          </p>
        ) : (
          <div className="space-y-2">
            {texturePrefs.map(([texture, score]) => (
              <div key={texture} className="flex items-center gap-3">
                <span className="w-32 text-sm uppercase">{texture}</span>
                <div className="flex-1 h-4 bg-ops-night-surface border border-ops-neon-green/30">
                  <div
                    className="h-full bg-ops-neon-green/50"
                    style={{ width: `${Math.min(100, (score as number) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm">
                  {Math.round((score as number) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Preferences */}
      <div>
        <h3 className="text-sm text-ops-night-text-dim uppercase tracking-wider mb-3">
          TEMPORAL PATTERNS
        </h3>
        {timePrefs.length === 0 ? (
          <p className="text-ops-night-text-dim">
            Activity patterns will appear as you use the system.
          </p>
        ) : (
          <div className="space-y-2">
            {timePrefs.map(([period, score]) => (
              <div key={period} className="flex items-center gap-3">
                <span className="w-32 text-sm uppercase">{period}</span>
                <div className="flex-1 h-4 bg-ops-night-surface border border-ops-neon-cyan/30">
                  <div
                    className="h-full bg-ops-neon-cyan/50"
                    style={{ width: `${Math.min(100, (score as number) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm">
                  {Math.round((score as number) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-ops-night-text-dim">
        🔒 Fingerprint data is used to personalize recommendations and is never shared.
      </p>
    </div>
  );
}

function ActivityTab({ activities }: { activities: any[] }) {
  return (
    <div>
      <p className="text-sm text-ops-night-text-dim mb-4">LAST 20 ACTIVITIES</p>
      <div className="space-y-1">
        {activities.map((activity, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 border border-ops-neon-green/20 hover:bg-ops-neon-green/5"
          >
            <div>
              <p className="text-sm uppercase">{activity.action_type.replace('_', ' ')}</p>
              {activity.payload?.zone_id && (
                <p className="text-xs text-ops-night-text-dim">Zone: {activity.payload.zone_id}</p>
              )}
            </div>
            <span className="text-xs text-ops-night-text-dim">
              {new Date(activity.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}
