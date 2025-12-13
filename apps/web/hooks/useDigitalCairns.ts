/**
 * React hook for Digital Cairns system
 * 
 * Manages invisible geo-fenced stacked stones at anchor points.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Cairn,
  StoneShape,
  StoneColor,
  placeStone,
  getCairn,
  getUserStone,
  getCairnsNear,
  canPlaceStone,
  getStoneSVG,
} from '../lib/digitalCairns';

interface UseDigitalCairnsReturn {
  cairn: Cairn | null;
  userStone: { shape: StoneShape; color: StoneColor } | null;
  canPlace: boolean;
  loading: boolean;
  placeStone: (shape: StoneShape, color: StoneColor) => Promise<void>;
  nearbyCairns: Cairn[];
  getSVG: (shape: StoneShape, color: StoneColor) => string;
}

export function useDigitalCairns(
  anchorId: string,
  userId: string
): UseDigitalCairnsReturn {
  const [cairn, setCairn] = useState<Cairn | null>(null);
  const [userStone, setUserStone] = useState<{ shape: StoneShape; color: StoneColor } | null>(null);
  const [canPlace, setCanPlace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nearbyCairns, setNearbyCairns] = useState<Cairn[]>([]);

  // Load cairn data for this anchor
  useEffect(() => {
    async function loadCairn() {
      if (!anchorId || !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [cairnData, userStoneData, canPlaceResult] = await Promise.all([
          getCairn(anchorId),
          getUserStone(anchorId, userId),
          canPlaceStone(anchorId),
        ]);

        setCairn(cairnData);
        setUserStone(userStoneData);
        setCanPlace(canPlaceResult);
      } catch (err) {
        console.error('[CAIRNS] Error loading cairn:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCairn();
  }, [anchorId, userId]);

  // Place a stone on this cairn
  const handlePlaceStone = useCallback(
    async (shape: StoneShape, color: StoneColor) => {
      if (!anchorId || !userId || !canPlace) return;

      try {
        await placeStone(anchorId, userId, shape, color);

        // Refresh cairn data
        const [newCairn, newUserStone] = await Promise.all([
          getCairn(anchorId),
          getUserStone(anchorId, userId),
        ]);

        setCairn(newCairn);
        setUserStone(newUserStone);
        setCanPlace(false); // Can't place again after placing
      } catch (err) {
        console.error('[CAIRNS] Error placing stone:', err);
        throw err;
      }
    },
    [anchorId, userId, canPlace]
  );

  // Get SVG for a stone
  const getSVG = useCallback((shape: StoneShape, color: StoneColor) => {
    return getStoneSVG(shape, color);
  }, []);

  return {
    cairn,
    userStone,
    canPlace,
    loading,
    placeStone: handlePlaceStone,
    nearbyCairns,
    getSVG,
  };
}

/**
 * Hook to load nearby cairns for map display
 */
export function useNearbyCairns(
  lat: number | null,
  lng: number | null,
  radiusMeters: number = 500
): { cairns: Cairn[]; loading: boolean } {
  const [cairns, setCairns] = useState<Cairn[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadNearby() {
      if (lat === null || lng === null) return;

      setLoading(true);
      try {
        const nearby = await getCairnsNear(lat, lng, radiusMeters);
        setCairns(nearby);
      } catch (err) {
        console.error('[CAIRNS] Error loading nearby:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNearby();
  }, [lat, lng, radiusMeters]);

  return { cairns, loading };
}
