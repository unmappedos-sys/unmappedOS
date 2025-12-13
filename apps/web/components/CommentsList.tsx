/**
 * CommentsList Component - Display structured intel for a zone
 * Implements trust-scored comment display with verification badges
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

type Comment = {
  id: string;
  short_tag: string;
  note: string;
  price: number | null;
  photo_url: string | null;
  created_at: string;
  verified: boolean;
  trust_score: number;
  user_hash: string;
};

type CommentsListProps = {
  zoneId: string;
  city: string;
  maxHeight?: string;
};

const TAG_COLORS: Record<string, string> = {
  CONSTRUCTION: 'text-orange-500',
  CROWD_SURGE: 'text-red-500',
  OVERPRICING: 'text-yellow-500',
  HASSLE: 'text-red-400',
  SAFETY_OBSERVED: 'text-green-500',
  GOOD_FOR_DAY: 'text-blue-400',
  GOOD_FOR_NIGHT: 'text-purple-500',
  CLEAN: 'text-green-400',
  TOILET_AVAILABLE: 'text-cyan-500',
  ACCESS_ISSUE: 'text-orange-400',
};

export default function CommentsList({ zoneId, city, maxHeight = '400px' }: CommentsListProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
  }, [zoneId]);

  const loadComments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/comments/list?zone_id=${zoneId}&city=${city}`);
      if (!response.ok) {
        throw new Error('Failed to load intel');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) {
      return `${diffDays}D AGO`;
    } else if (diffDays > 0) {
      return `${diffDays}D ${diffHours % 24}H AGO`;
    } else if (diffHours > 0) {
      return `${diffHours}H AGO`;
    } else {
      return 'RECENT';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-green-500">LOADING INTEL...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-500/50 bg-red-500/10 p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="border border-green-500/30 bg-green-500/5 p-6 text-center text-green-400/70">
        NO INTEL AVAILABLE // BE THE FIRST TO REPORT
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ maxHeight, overflowY: 'auto' }}>
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="border border-green-500/30 bg-black/50 p-4 transition hover:border-green-500/50"
        >
          {/* Header */}
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${TAG_COLORS[comment.short_tag] || 'text-green-500'}`}>
                {comment.short_tag}
              </span>
              {comment.verified && (
                <span className="text-xs text-green-500" title="Verified by operatives">
                  ✓ VERIFIED
                </span>
              )}
            </div>
            <span className="text-xs text-green-400/50">{formatTimestamp(comment.created_at)}</span>
          </div>

          {/* Note */}
          <p className="mb-2 text-sm text-green-400">{comment.note}</p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-green-400/70">
            <span>OPERATIVE: {comment.user_hash}</span>
            <div className="flex items-center gap-3">
              {comment.price && <span>PRICE: ${comment.price.toFixed(2)}</span>}
              <span title="Trust score based on verifications">
                TRUST: {comment.trust_score}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
