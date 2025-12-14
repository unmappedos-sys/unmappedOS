/**
 * Intel Submission Form Component
 * 
 * Allows users to submit structured intel:
 * - Price reports
 * - Hassle reports
 * - Crowd levels
 * - Construction alerts
 * - Hazard reports
 * - Zone verification
 */

import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type IntelType = 
  | 'PRICE_SUBMISSION'
  | 'HASSLE_REPORT'
  | 'CONSTRUCTION'
  | 'CROWD_SURGE'
  | 'QUIET_CONFIRMED'
  | 'HAZARD_REPORT'
  | 'VERIFICATION';

interface IntelFormProps {
  zoneId: string;
  zoneName: string;
  onSubmit: (data: IntelSubmissionData) => Promise<void>;
  onCancel: () => void;
}

interface IntelSubmissionData {
  zone_id: string;
  type: IntelType;
  data: Record<string, unknown>;
}

// ============================================================================
// INTEL TYPE CONFIG
// ============================================================================

const INTEL_TYPES: Array<{
  type: IntelType;
  label: string;
  icon: string;
  description: string;
  karma: number;
}> = [
  {
    type: 'PRICE_SUBMISSION',
    label: 'Price Report',
    icon: '💰',
    description: 'Report local prices for coffee, beer, food, transport',
    karma: 5,
  },
  {
    type: 'QUIET_CONFIRMED',
    label: 'Quiet Zone',
    icon: '🤫',
    description: 'Confirm this area is currently calm and quiet',
    karma: 3,
  },
  {
    type: 'CROWD_SURGE',
    label: 'Crowd Alert',
    icon: '👥',
    description: 'Report unusual crowding or long wait times',
    karma: 3,
  },
  {
    type: 'HASSLE_REPORT',
    label: 'Hassle Report',
    icon: '⚡',
    description: 'Report scams, overcharging, or aggressive vendors',
    karma: 10,
  },
  {
    type: 'CONSTRUCTION',
    label: 'Construction',
    icon: '🚧',
    description: 'Report construction or road closures',
    karma: 8,
  },
  {
    type: 'HAZARD_REPORT',
    label: 'Hazard Alert',
    icon: '⚠️',
    description: 'Report serious safety concerns',
    karma: 15,
  },
  {
    type: 'VERIFICATION',
    label: 'Verify Zone',
    icon: '✓',
    description: 'Confirm zone info is still accurate',
    karma: 10,
  },
];

// ============================================================================
// PRICE FORM
// ============================================================================

function PriceForm({ 
  onData 
}: { 
  onData: (data: Record<string, unknown>) => void;
}) {
  const [item, setItem] = useState('coffee');
  const [price, setPrice] = useState('');
  const [isTourist, setIsTourist] = useState(false);
  const [venue, setVenue] = useState('');

  React.useEffect(() => {
    if (price) {
      onData({
        item,
        price: parseFloat(price),
        is_tourist_price: isTourist,
        venue_name: venue || undefined,
      });
    }
  }, [item, price, isTourist, venue, onData]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Item
        </label>
        <select
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
        >
          <option value="coffee">Coffee ☕</option>
          <option value="beer">Beer 🍺</option>
          <option value="meal_street">Street Food 🍜</option>
          <option value="meal_restaurant">Restaurant Meal 🍽️</option>
          <option value="transport">Local Transport 🚕</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Price (local currency)
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 60"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Venue (optional)
        </label>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="e.g., Cafe name"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          checked={isTourist}
          onChange={(e) => setIsTourist(e.target.checked)}
          className="rounded bg-gray-800 border-gray-700"
        />
        This was a tourist-area price
      </label>
    </div>
  );
}

// ============================================================================
// HASSLE FORM
// ============================================================================

function HassleForm({ 
  onData 
}: { 
  onData: (data: Record<string, unknown>) => void;
}) {
  const [hassleType, setHassleType] = useState('OVERCHARGE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    onData({
      hassle_type: hassleType,
      severity,
      description: description || undefined,
    });
  }, [hassleType, severity, description, onData]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Type
        </label>
        <select
          value={hassleType}
          onChange={(e) => setHassleType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
        >
          <option value="OVERCHARGE">Overcharging</option>
          <option value="SCAM">Scam attempt</option>
          <option value="AGGRESSIVE_VENDOR">Aggressive vendor</option>
          <option value="TAXI_REFUSAL">Taxi meter refusal</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Severity
        </label>
        <div className="flex gap-2">
          {['LOW', 'MEDIUM', 'HIGH'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`flex-1 py-2 rounded text-sm font-mono ${
                severity === s
                  ? s === 'HIGH' 
                    ? 'bg-red-600 text-white'
                    : s === 'MEDIUM'
                    ? 'bg-yellow-600 text-black'
                    : 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Details (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
          rows={3}
          maxLength={500}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// CROWD FORM
// ============================================================================

function CrowdForm({ 
  onData 
}: { 
  onData: (data: Record<string, unknown>) => void;
}) {
  const [level, setLevel] = useState('MODERATE');
  const [waitTime, setWaitTime] = useState('');

  React.useEffect(() => {
    onData({
      level,
      wait_time_minutes: waitTime ? parseInt(waitTime) : undefined,
    });
  }, [level, waitTime, onData]);

  const levels = [
    { value: 'EMPTY', label: 'Empty', icon: '🟢' },
    { value: 'LIGHT', label: 'Light', icon: '🟡' },
    { value: 'MODERATE', label: 'Moderate', icon: '🟠' },
    { value: 'CROWDED', label: 'Crowded', icon: '🔴' },
    { value: 'PACKED', label: 'Packed', icon: '⛔' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
          Crowd Level
        </label>
        <div className="grid grid-cols-5 gap-1">
          {levels.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              className={`py-2 rounded text-center ${
                level === l.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              <div className="text-lg">{l.icon}</div>
              <div className="text-xs">{l.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Wait Time (optional, minutes)
        </label>
        <input
          type="number"
          value={waitTime}
          onChange={(e) => setWaitTime(e.target.value)}
          placeholder="e.g., 15"
          min="0"
          max="300"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// VERIFICATION FORM
// ============================================================================

function VerificationForm({ 
  onData 
}: { 
  onData: (data: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState('CONFIRMED_ACCURATE');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    onData({
      status,
      notes: notes || undefined,
    });
  }, [status, notes, onData]);

  const statuses = [
    { value: 'CONFIRMED_ACCURATE', label: '✓ Accurate', color: 'bg-green-600' },
    { value: 'MINOR_CHANGES', label: '~ Minor changes', color: 'bg-yellow-600' },
    { value: 'SIGNIFICANT_CHANGES', label: '! Major changes', color: 'bg-orange-600' },
    { value: 'INCORRECT', label: '✗ Incorrect', color: 'bg-red-600' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
          Zone Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`py-2 px-3 rounded text-sm text-left ${
                status === s.value
                  ? `${s.color} text-white`
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any updates or corrections?"
          rows={2}
          maxLength={500}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-green-500 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN FORM
// ============================================================================

export function IntelSubmissionForm({ 
  zoneId, 
  zoneName, 
  onSubmit, 
  onCancel 
}: IntelFormProps) {
  const [selectedType, setSelectedType] = useState<IntelType | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSubmit({
        zone_id: zoneId,
        type: selectedType,
        data: formData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedConfig = INTEL_TYPES.find(t => t.type === selectedType);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <h3 className="font-mono text-sm text-green-400 uppercase tracking-wider">
          Submit Intel
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {zoneName}
        </p>
      </div>

      {/* Type Selection */}
      {!selectedType && (
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3">What do you want to report?</p>
          <div className="grid grid-cols-2 gap-2">
            {INTEL_TYPES.map((intel) => (
              <button
                key={intel.type}
                onClick={() => setSelectedType(intel.type)}
                className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <span className="text-xl">{intel.icon}</span>
                <div>
                  <div className="text-sm text-white">{intel.label}</div>
                  <div className="text-xs text-gray-500">{intel.description}</div>
                  <div className="text-xs text-green-400 mt-1">+{intel.karma} karma</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type-Specific Form */}
      {selectedType && (
        <div className="p-4">
          {/* Type Header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
            <span className="text-xl">{selectedConfig?.icon}</span>
            <div>
              <div className="text-sm text-white">{selectedConfig?.label}</div>
              <div className="text-xs text-green-400">+{selectedConfig?.karma} karma</div>
            </div>
            <button
              onClick={() => {
                setSelectedType(null);
                setFormData({});
              }}
              className="ml-auto text-xs text-gray-500 hover:text-white"
            >
              Change
            </button>
          </div>

          {/* Dynamic Form */}
          {selectedType === 'PRICE_SUBMISSION' && (
            <PriceForm onData={setFormData} />
          )}
          {selectedType === 'HASSLE_REPORT' && (
            <HassleForm onData={setFormData} />
          )}
          {(selectedType === 'CROWD_SURGE') && (
            <CrowdForm onData={setFormData} />
          )}
          {selectedType === 'VERIFICATION' && (
            <VerificationForm onData={setFormData} />
          )}
          {selectedType === 'QUIET_CONFIRMED' && (
            <div className="text-center py-6 text-gray-400">
              <span className="text-4xl">🤫</span>
              <p className="mt-2 text-sm">Confirm this zone is currently quiet and calm</p>
            </div>
          )}
          {selectedType === 'CONSTRUCTION' && (
            <div className="text-center py-6 text-gray-400">
              <span className="text-4xl">🚧</span>
              <p className="mt-2 text-sm">Report construction or roadwork in this zone</p>
            </div>
          )}
          {selectedType === 'HAZARD_REPORT' && (
            <div className="text-center py-6 text-orange-400">
              <span className="text-4xl">⚠️</span>
              <p className="mt-2 text-sm">Report a serious safety concern</p>
              <p className="text-xs text-gray-500 mt-1">
                Multiple hazard reports will mark zone OFFLINE
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Intel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntelSubmissionForm;
