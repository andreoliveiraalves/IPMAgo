import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchForecast } from '@/api/ipma';
import type { ForecastBundle } from '@/api/ipma/types';
import { asIpmaError } from '@/lib/weather';

import { readJson, storageKeys, writeJson } from '@/storage/storage';

/**
 * Data is persisted indefinitely — it is replaced on every successful request.
 * The TTL only avoids hitting the API again for data we fetched minutes ago;
 * cached data is always rendered immediately (stale-while-revalidate).
 */
export const FORECAST_STALE_MS = 10 * 60 * 1000;

export type ForecastEntry = {
  bundle: ForecastBundle | null;
  isLoading: boolean;
  error: string | null;
};

export const EMPTY_ENTRY: ForecastEntry = { bundle: null, isLoading: false, error: null };

export type ForecastListState = {
  entries: Record<number, ForecastEntry>;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useForecastList(ids: number[]): ForecastListState {
  const [entries, setEntries] = useState<Record<number, ForecastEntry>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const alive = useRef(true);
  const key = ids.join(',');

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  const update = useCallback((id: number, patch: Partial<ForecastEntry>) => {
    setEntries((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_ENTRY), ...patch },
    }));
  }, []);

  const loadOne = useCallback(
    async (id: number, force: boolean) => {
      if (!force) {
        const cached = await readJson<ForecastBundle>(storageKeys.forecast(id));
        if (!alive.current) {
          return;
        }

        if (cached?.days?.length) {
          update(id, { bundle: cached, isLoading: false });

          if (Date.now() - cached.fetchedAt < FORECAST_STALE_MS) {
            return;
          }
        }
      }

      update(id, { isLoading: true });

      try {
        const days = await fetchForecast(id);
        if (!alive.current) {
          return;
        }

        const bundle: ForecastBundle = { globalIdLocal: id, days, fetchedAt: Date.now() };
        update(id, { bundle, isLoading: false, error: null });
        void writeJson(storageKeys.forecast(id), bundle);
      } catch (err) {
        if (alive.current) {
          update(id, { isLoading: false, error: asIpmaError(err).message });
        }
      }
    },
    [update]
  );

  useEffect(() => {
    const current = key ? key.split(',').map(Number) : [];
    void Promise.allSettled(current.map((id) => loadOne(id, false)));
  }, [key, loadOne]);

  const refresh = useCallback(async () => {
    const current = key ? key.split(',').map(Number) : [];
    setIsRefreshing(true);
    await Promise.allSettled(current.map((id) => loadOne(id, true)));
    if (alive.current) {
      setIsRefreshing(false);
    }
  }, [key, loadOne]);

  return { entries, isRefreshing, refresh };
}
