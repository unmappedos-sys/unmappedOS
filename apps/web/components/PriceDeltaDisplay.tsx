/**
 * Price Delta Display Component
 * 
 * Shows price comparison with zone medians.
 */

import { PriceDelta, formatPriceDeltaMessage } from '@/lib/priceDelta';

interface PriceDeltaDisplayProps {
  delta: PriceDelta;
  showDetails?: boolean;
}

export function PriceDeltaDisplay({ delta, showDetails = false }: PriceDeltaDisplayProps) {
  const statusColors: Record<PriceDelta['status'], string> = {
    BARGAIN: 'text-ops-neon-green border-ops-neon-green bg-ops-neon-green/10',
    NORMAL: 'text-ops-night-text border-ops-neon-green/30 bg-transparent',
    HIGH: 'text-ops-neon-amber border-ops-neon-amber bg-ops-neon-amber/10',
    OVERPRICED: 'text-ops-neon-red border-ops-neon-red bg-ops-neon-red/10',
  };

  const statusIcons: Record<PriceDelta['status'], string> = {
    BARGAIN: '✓',
    NORMAL: '●',
    HIGH: '⚠',
    OVERPRICED: '⛔',
  };

  const colors = statusColors[delta.status];
  const icon = statusIcons[delta.status];
  const sign = delta.delta_percentage >= 0 ? '+' : '';

  return (
    <div className={`px-3 py-2 border-l-2 ${colors} font-mono`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm uppercase tracking-wide">
            {delta.category.replace('_', ' ')}
          </span>
        </div>
        <span className="text-lg font-bold">
          {sign}{Math.round(delta.delta_percentage)}%
        </span>
      </div>

      {showDetails && (
        <div className="mt-2 text-xs text-ops-night-text-dim space-y-1">
          <div className="flex justify-between">
            <span>YOUR PRICE:</span>
            <span>{delta.submitted_price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>ZONE MEDIAN:</span>
            <span>{delta.zone_median.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>DELTA:</span>
            <span>{sign}{delta.delta_amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-ops-night-text-dim">
        {formatPriceDeltaMessage(delta)}
      </p>
    </div>
  );
}

interface PriceSubmissionFormProps {
  zoneId: string;
  city: string;
  onSubmit: (data: {
    category: string;
    amount: number;
    currency: string;
    notes?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function PriceSubmissionForm({
  zoneId,
  city,
  onSubmit,
  onCancel,
}: PriceSubmissionFormProps) {
  const categories = [
    { value: 'meal_cheap', label: 'MEAL (CHEAP)' },
    { value: 'meal_mid', label: 'MEAL (MID)' },
    { value: 'coffee', label: 'COFFEE' },
    { value: 'beer', label: 'BEER' },
    { value: 'water_bottle', label: 'WATER BOTTLE' },
    { value: 'transit_single', label: 'TRANSIT (SINGLE)' },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await onSubmit({
      category: formData.get('category') as string,
      amount: parseFloat(formData.get('amount') as string),
      currency: formData.get('currency') as string,
      notes: formData.get('notes') as string || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-ops-night-text-dim mb-1 uppercase tracking-wider">
          Category
        </label>
        <select
          name="category"
          required
          className="w-full bg-ops-night border border-ops-neon-green/30 text-ops-night-text px-3 py-2 font-mono text-sm focus:border-ops-neon-green focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-ops-night-text-dim mb-1 uppercase tracking-wider">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            className="w-full bg-ops-night border border-ops-neon-green/30 text-ops-night-text px-3 py-2 font-mono text-sm focus:border-ops-neon-green focus:outline-none"
            placeholder="0.00"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-ops-night-text-dim mb-1 uppercase tracking-wider">
            Currency
          </label>
          <select
            name="currency"
            required
            className="w-full bg-ops-night border border-ops-neon-green/30 text-ops-night-text px-3 py-2 font-mono text-sm focus:border-ops-neon-green focus:outline-none"
          >
            <option value="USD">USD</option>
            <option value="THB">THB</option>
            <option value="JPY">JPY</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-ops-night-text-dim mb-1 uppercase tracking-wider">
          Notes (Optional)
        </label>
        <input
          type="text"
          name="notes"
          maxLength={200}
          className="w-full bg-ops-night border border-ops-neon-green/30 text-ops-night-text px-3 py-2 font-mono text-sm focus:border-ops-neon-green focus:outline-none"
          placeholder="Any details..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-ops-neon-green/10 border border-ops-neon-green text-ops-neon-green px-4 py-2 font-tactical text-sm uppercase tracking-wider hover:bg-ops-neon-green/20 transition-colors"
        >
          Submit Price
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-ops-neon-green/30 text-ops-night-text-dim font-tactical text-sm uppercase tracking-wider hover:border-ops-neon-green/50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default PriceDeltaDisplay;
