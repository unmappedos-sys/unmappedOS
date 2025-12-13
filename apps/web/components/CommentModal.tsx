/**
 * CommentModal Component - Submit structured intel
 * Implements mission lexicon UI for field intelligence updates
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useVibration } from '@/hooks/useVibration';

type ShortTag =
  | 'CONSTRUCTION'
  | 'CROWD_SURGE'
  | 'OVERPRICING'
  | 'HASSLE'
  | 'SAFETY_OBSERVED'
  | 'GOOD_FOR_DAY'
  | 'GOOD_FOR_NIGHT'
  | 'CLEAN'
  | 'TOILET_AVAILABLE'
  | 'ACCESS_ISSUE';

type CommentModalProps = {
  zoneId: string;
  city: string;
  zoneName: string;
  onClose: () => void;
  onSubmit?: () => void;
};

const SHORT_TAG_OPTIONS: { value: ShortTag; label: string; color: string }[] = [
  { value: 'CONSTRUCTION', label: 'CONSTRUCTION', color: 'text-orange-500' },
  { value: 'CROWD_SURGE', label: 'CROWD SURGE', color: 'text-red-500' },
  { value: 'OVERPRICING', label: 'OVERPRICING', color: 'text-yellow-500' },
  { value: 'HASSLE', label: 'HASSLE', color: 'text-red-400' },
  { value: 'SAFETY_OBSERVED', label: 'SAFETY OBSERVED', color: 'text-green-500' },
  { value: 'GOOD_FOR_DAY', label: 'GOOD FOR DAY', color: 'text-blue-400' },
  { value: 'GOOD_FOR_NIGHT', label: 'GOOD FOR NIGHT', color: 'text-purple-500' },
  { value: 'CLEAN', label: 'CLEAN', color: 'text-green-400' },
  { value: 'TOILET_AVAILABLE', label: 'TOILET AVAILABLE', color: 'text-cyan-500' },
  { value: 'ACCESS_ISSUE', label: 'ACCESS ISSUE', color: 'text-orange-400' },
];

export default function CommentModal({
  zoneId,
  city,
  zoneName,
  onClose,
  onSubmit,
}: CommentModalProps) {
  const { t } = useTranslation();
  const { enqueue, isOnline } = useOfflineQueue();
  const { vibrate } = useVibration();

  const [shortTag, setShortTag] = useState<ShortTag>('SAFETY_OBSERVED');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) {
      setError('NOTE REQUIRED // INTEL CANNOT BE EMPTY');
      vibrate('button_press');
      return;
    }

    if (note.length > 240) {
      setError('NOTE TOO LONG // MAX 240 CHARACTERS');
      vibrate('button_press');
      return;
    }

    setSubmitting(true);
    setError('');

    const commentData = {
      zone_id: zoneId,
      city,
      short_tag: shortTag,
      note: note.trim(),
      price: price ? parseFloat(price) : undefined,
      anonymous,
    };

    try {
      if (isOnline) {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Submission failed');
        }

        setSuccess(true);
        vibrate('anchor_lock');
        setTimeout(() => {
          onSubmit?.();
          onClose();
        }, 1500);
      } else {
        // Queue for offline sync
        enqueue('comment', commentData);
        setSuccess(true);
        vibrate('button_press');
        setTimeout(() => {
          onSubmit?.();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'TRANSMISSION FAILED // RETRY');
      vibrate('button_press');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg border-2 border-green-500 bg-black p-6 font-mono shadow-[0_0_30px_rgba(0,255,0,0.3)]">
        {/* Header */}
        <div className="mb-6 border-b border-green-500/30 pb-3">
          <h2 className="text-xl font-bold text-green-500">UPDATE INTEL</h2>
          <p className="text-sm text-green-400/70">ZONE: {zoneName.toUpperCase()}</p>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl text-green-500">✓</div>
            <p className="text-lg text-green-500">INTEL LOGGED</p>
            <p className="mt-2 text-sm text-green-400/70">
              {isOnline ? 'FIELD UPDATE RECORDED' : 'QUEUED FOR SYNC'}
            </p>
          </div>
        ) : (
          <>
            {/* Short Tag Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-sm text-green-400">SHORT TAG:</label>
              <select
                value={shortTag}
                onChange={(e) => setShortTag(e.target.value as ShortTag)}
                className="w-full border border-green-500/50 bg-black p-3 text-green-400 focus:border-green-500 focus:outline-none"
              >
                {SHORT_TAG_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Note Input */}
            <div className="mb-4">
              <label className="mb-2 block text-sm text-green-400">
                NOTE: ({note.length}/240)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                rows={4}
                placeholder="FIELD OBSERVATION // NO URLS OR PHONE NUMBERS"
                className="w-full border border-green-500/50 bg-black p-3 text-green-400 placeholder:text-green-500/30 focus:border-green-500 focus:outline-none"
              />
            </div>

            {/* Price Input (Optional) */}
            <div className="mb-4">
              <label className="mb-2 block text-sm text-green-400">PRICE (OPTIONAL):</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full border border-green-500/50 bg-black p-3 text-green-400 placeholder:text-green-500/30 focus:border-green-500 focus:outline-none"
              />
            </div>

            {/* Ghost Mode Toggle */}
            <div className="mb-6 flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mr-2 h-4 w-4 border-green-500 bg-black text-green-500 focus:ring-green-500"
              />
              <label htmlFor="anonymous" className="text-sm text-green-400">
                GHOST MODE: ANONYMOUS
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 border border-red-500 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 border border-green-500/50 bg-transparent p-3 text-green-400 transition hover:bg-green-500/10 disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 border border-green-500 bg-green-500/20 p-3 text-green-500 transition hover:bg-green-500/30 disabled:opacity-50"
              >
                {submitting ? 'TRANSMITTING...' : 'SUBMIT INTEL'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
