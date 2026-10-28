import { useEffect, useRef, useState } from 'react';

import { fetchMarine, type MarineBundle } from '@/api/marine';
import { toIsoDate } from '@/lib/dates';
import { readJson, storageKeys, writeJson } from '@/storage/storage';

/** Tides and marine model fields are refreshed a few times a day. */
export const MARINE_STALE_MS = 3 * 60 * 60 * 1000;

export type MarineState = {
  data: MarineBundle | null;
  isLoading: boolean;
};

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return toIsoDate(date);
}

/**
 * Hourly tide/current data for one sea zone and one day (plus a day on each
 * side, so the curve and the tide extremes are never cut short).
 *
 * Deliberately silent on failure: the sea card keeps showing the IPMA data it
 * already has instead of an error the user cannot act on.
 */
export function useMarine(
  zoneId: number | null,
  latitude: number | null,
  longitude: number | null,
  date: string | null
): MarineState {
  const [data, setData] = useState<MarineBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (zoneId === null || latitude === null || longitude === null || !date) {
      // Deferred so the reset does not run synchronously inside the effect.
      const reset = Promise.resolve().then(() => {
        if (alive.current) {
          setData(null);
          setIsLoading(false);
        }
      });

      return () => {
        void reset;
      };
    }

    const key = storageKeys.marine(zoneId, date);
    let cancelled = false;

    const load = async () => {
      const cached = await readJson<MarineBundle>(key);

      if (cancelled) {
        return;
      }

      if (cached?.hours?.length) {
        setData(cached);
      }

      if (cached?.hours?.length && Date.now() - cached.fetchedAt < MARINE_STALE_MS) {
        setIsLoading(false);
        return;
      }

      setIsLoading(!cached?.hours?.length);

      try {
        const bundle = await fetchMarine(
          latitude,
          longitude,
          shiftDate(date, -1),
          shiftDate(date, 1)
        );

        if (cancelled || !alive.current) {
          return;
        }

        setData(bundle);
        void writeJson(key, bundle);
      } catch {
        // Silent by design: the card degrades to IPMA-only data.
      } finally {
        if (!cancelled && alive.current) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [zoneId, latitude, longitude, date]);

  return { data, isLoading };
}
