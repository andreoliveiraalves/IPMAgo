import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchFireRisk, fetchSeaForecast } from '@/api/ipma';
import type { FireRiskBundle, SeaBundle } from '@/api/ipma/types';
import { toIsoDate } from '@/lib/dates';
import { asIpmaError } from '@/lib/weather';
import { readJson, storageKeys, writeJson } from '@/storage/storage';

/** Fire risk is updated hourly; sea state daily. One hour covers both. */
export const HAZARDS_STALE_MS = 60 * 60 * 1000;

export type HazardsState = {
  fire: FireRiskBundle | null;
  sea: SeaBundle | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Bulk hazard data (fire risk + sea state), shared by every day sheet.
 * Files are cached per calendar day and revalidated after one hour.
 */
export function useHazards(): HazardsState {
  const [fire, setFire] = useState<FireRiskBundle | null>(null);
  const [sea, setSea] = useState<SeaBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (force: boolean) => {
    const date = toIsoDate(new Date());
    const [cachedFire, cachedSea] = await Promise.all([
      readJson<FireRiskBundle>(storageKeys.fireRisk(date)),
      readJson<SeaBundle>(storageKeys.sea(date)),
    ]);

    if (alive.current) {
      if (cachedFire?.days?.length) {
        setFire(cachedFire);
      }
      if (cachedSea?.zones?.length) {
        setSea(cachedSea);
      }
    }

    const cachedFresh =
      Boolean(cachedFire?.days?.length) &&
      Boolean(cachedSea?.zones?.length) &&
      Date.now() - Math.min(cachedFire?.fetchedAt ?? 0, cachedSea?.fetchedAt ?? 0) <
        HAZARDS_STALE_MS;

    if (!force && cachedFresh) {
      if (alive.current) {
        setIsLoading(false);
      }
      return;
    }

    if (alive.current) {
      setIsLoading(true);
    }

    const [fireResult, seaResult] = await Promise.allSettled([
      fetchFireRisk(),
      fetchSeaForecast(),
    ]);

    let firstError: string | null = null;

    if (fireResult.status === 'fulfilled') {
      void writeJson(storageKeys.fireRisk(date), fireResult.value);
      if (alive.current) {
        setFire(fireResult.value);
      }
    } else {
      firstError = asIpmaError(fireResult.reason).message;
    }

    if (seaResult.status === 'fulfilled') {
      void writeJson(storageKeys.sea(date), seaResult.value);
      if (alive.current) {
        setSea(seaResult.value);
      }
    } else {
      firstError ??= asIpmaError(seaResult.reason).message;
    }

    if (alive.current) {
      setError(firstError);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    // Deferred to a microtask so cached data is applied after the first render.
    void Promise.resolve().then(() => load(false));
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { fire, sea, isLoading, error, refresh };
}
