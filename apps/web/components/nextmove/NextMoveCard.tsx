/**
 * NEXT MOVE — Primary Screen
 *
 * The ONLY screen that matters.
 * Shows ONE recommendation. Nothing else.
 */

import type { Recommendation } from './types';

interface NextMoveCardProps {
  recommendation: Recommendation | null;
  onShowMe: () => void;
  onWhy: () => void;
  loading?: boolean;
}

export default function NextMoveCard({
  recommendation,
  onShowMe,
  onWhy,
  loading = false,
}: NextMoveCardProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-sm">Analyzing area...</p>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-stone-500">No data for this area yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6">
      {/* Primary Recommendation */}
      <div className="mb-8">
        <p className="text-2xl sm:text-3xl font-medium text-stone-900 leading-snug">
          {recommendation.action}
        </p>
      </div>

      {/* Secondary Context */}
      <div className="mb-12">
        <p className="text-base text-stone-500">{recommendation.context}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {recommendation.destination && (
          <button
            onClick={onShowMe}
            className="flex-1 py-4 px-6 bg-stone-900 text-white rounded-2xl font-medium text-base active:scale-[0.98] transition-transform"
          >
            Show Me
          </button>
        )}
        <button
          onClick={onWhy}
          className="flex-1 py-4 px-6 bg-stone-100 text-stone-700 rounded-2xl font-medium text-base active:scale-[0.98] transition-transform"
        >
          Why?
        </button>
      </div>
    </div>
  );
}
