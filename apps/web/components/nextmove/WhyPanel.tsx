/**
 * WHY PANEL — Explains the recommendation
 *
 * Shows 1-2 factual comparisons.
 * No charts. No scores. No jargon.
 */

import type { Recommendation } from './types';

interface WhyPanelProps {
  recommendation: Recommendation | null;
  visible: boolean;
  onClose: () => void;
}

export default function WhyPanel({ recommendation, visible, onClose }: WhyPanelProps) {
  if (!recommendation || !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl">
        <div className="p-6 pb-8">
          {/* Handle */}
          <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-6" />

          {/* Reason */}
          <p className="text-lg text-stone-800 leading-relaxed mb-6">{recommendation.reason}</p>

          {/* Trigger indicator (subtle) */}
          <div className="flex items-center gap-2 mb-6">
            <TriggerBadge trigger={recommendation.trigger} />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-stone-100 text-stone-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}

function TriggerBadge({ trigger }: { trigger: Recommendation['trigger'] }) {
  const labels: Record<Recommendation['trigger'], string> = {
    price: 'Based on prices',
    crowd: 'Based on crowds',
    time: 'Based on time',
    safety: 'Based on safety',
    general: 'General advice',
  };

  const colors: Record<Recommendation['trigger'], string> = {
    price: 'bg-emerald-50 text-emerald-700',
    crowd: 'bg-amber-50 text-amber-700',
    time: 'bg-blue-50 text-blue-700',
    safety: 'bg-red-50 text-red-700',
    general: 'bg-stone-100 text-stone-600',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[trigger]}`}>
      {labels[trigger]}
    </span>
  );
}
