/**
 * DigitalCairns Component
 * 
 * View and place invisible geo-fenced stacked stones at anchor points.
 * "Like Dark Souls messages, but shape-only. No text. No toxicity."
 */

import React, { useState } from 'react';
import { useDigitalCairns } from '../hooks/useDigitalCairns';
import { StoneShape, StoneColor, StoneColorName, STONE_SHAPES, STONE_COLORS, STONE_COLORS_HEX, COLOR_NAME_TO_HEX } from '../lib/digitalCairns';

interface DigitalCairnsProps {
  anchorId: string;
  anchorName?: string;
  userId: string;
  onClose?: () => void;
}

export function DigitalCairns({
  anchorId,
  anchorName,
  userId,
  onClose,
}: DigitalCairnsProps) {
  const {
    cairn,
    userStone,
    canPlace,
    loading,
    placeStone,
    getSVG,
  } = useDigitalCairns(anchorId, userId);

  const [selectedShape, setSelectedShape] = useState<StoneShape>('circle');
  const [selectedColor, setSelectedColor] = useState<StoneColorName>('white');
  const [placing, setPlacing] = useState(false);

  const handlePlace = async () => {
    setPlacing(true);
    try {
      // Convert color name to hex for API
      const hexColor = COLOR_NAME_TO_HEX[selectedColor];
      await placeStone(selectedShape, hexColor);
    } catch (err) {
      console.error('Failed to place stone:', err);
    } finally {
      setPlacing(false);
    }
  };

  const colorClasses: Record<StoneColorName, string> = {
    white: 'bg-white',
    gray: 'bg-blue-400',
    red: 'bg-red-500',
    orange: 'bg-amber-500',
    yellow: 'bg-yellow-300',
    green: 'bg-emerald-400',
    blue: 'bg-blue-500',
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗿</span>
          <div>
            <h2 className="text-white font-bold">DIGITAL CAIRN</h2>
            <p className="text-gray-500 text-xs">{anchorName || 'Anchor Point'}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading cairn...</div>
        </div>
      ) : (
        <>
          {/* Cairn Display */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {cairn && cairn.stones.length > 0 ? (
              <>
                <div className="relative mb-4">
                  {/* Stack of stones */}
                  <div className="flex flex-col-reverse items-center gap-1">
                    {cairn.stones.slice(-10).map((stone, i) => (
                      <div
                        key={stone.id}
                        className={`transition-all ${
                          stone.user_hash === userId.slice(0, 8) ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
                        }`}
                        style={{
                          opacity: 0.5 + (i / cairn.stones.length) * 0.5,
                        }}
                        dangerouslySetInnerHTML={{ __html: getSVG(stone.shape, stone.color) }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  {cairn.stones.length} stone{cairn.stones.length !== 1 ? 's' : ''} • Total: {cairn.total_count}
                </div>
                <p className="text-gray-600 text-xs mt-2 text-center max-w-xs">
                  Each stone represents a traveler who passed through this anchor.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4 opacity-30">🗿</div>
                <h3 className="text-gray-400 text-lg">No cairn here yet</h3>
                <p className="text-gray-600 text-sm text-center max-w-xs mt-2">
                  Be the first to place a stone and start the cairn.
                </p>
              </>
            )}
          </div>

          {/* Stone Placer */}
          {canPlace ? (
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <h3 className="text-white font-bold mb-3">Place Your Stone</h3>

              {/* Shape selector */}
              <div className="mb-4">
                <div className="text-gray-500 text-xs mb-2">SHAPE</div>
                <div className="flex gap-2 flex-wrap">
                  {STONE_SHAPES.map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setSelectedShape(shape)}
                      className={`p-2 rounded border-2 transition-all ${
                        selectedShape === shape
                          ? 'border-emerald-500 bg-emerald-950'
                          : 'border-gray-700 bg-gray-800'
                      }`}
                      dangerouslySetInnerHTML={{ __html: getSVG(shape, '#ffffff') }}
                    />
                  ))}
                </div>
              </div>

              {/* Color selector */}
              <div className="mb-4">
                <div className="text-gray-500 text-xs mb-2">COLOR</div>
                <div className="flex gap-2 flex-wrap">
                  {STONE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${colorClasses[color]} ${
                        selectedColor === color
                          ? 'border-emerald-400 ring-2 ring-emerald-400/50'
                          : 'border-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-4 mb-4">
                <div className="text-gray-500 text-xs">PREVIEW:</div>
                <div
                  dangerouslySetInnerHTML={{ __html: getSVG(selectedShape, COLOR_NAME_TO_HEX[selectedColor]) }}
                />
              </div>

              <button
                onClick={handlePlace}
                disabled={placing}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  placing
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {placing ? 'Placing...' : '🗿 PLACE STONE'}
              </button>
            </div>
          ) : userStone ? (
            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <div
                  dangerouslySetInnerHTML={{ __html: getSVG(userStone.shape, userStone.color) }}
                />
                <div>
                  <div className="text-emerald-400 text-sm font-bold">Your stone is here</div>
                  <div className="text-gray-500 text-xs">One stone per traveler per anchor</div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Compact Cairn indicator for anchor cards
 */
interface CairnBadgeProps {
  anchorId: string;
  userId: string;
  onClick?: () => void;
}

export function CairnBadge({ anchorId, userId, onClick }: CairnBadgeProps) {
  const { cairn, userStone } = useDigitalCairns(anchorId, userId);

  if (!cairn || cairn.stones.length === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded-full"
    >
      <span className="text-sm">🗿</span>
      <span className="text-gray-400 text-xs">{cairn.stones.length}</span>
      {userStone && <span className="text-emerald-400 text-xs">✓</span>}
    </button>
  );
}

export default DigitalCairns;
