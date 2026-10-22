import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchLocations } from '@/api/ipma';
import type { IpmaLocation } from '@/api/ipma/types';
import { asIpmaError } from '@/lib/weather';
import { readJson, storageKeys, writeJson } from '@/storage/storage';

type CachedLocations = {
  locations: IpmaLocation[];
  fetchedAt: number;
};

export type LocationsState = {
  locations: IpmaLocation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useLocations(): LocationsState {
  const [locations, setLocations] = useState<IpmaLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const fresh = await fetchLocations();
      if (!alive.current) {
        return;
      }

      setLocations(fresh);
      setError(null);
      void writeJson<CachedLocations>(storageKeys.locations, {
        locations: fresh,
        fetchedAt: Date.now(),
      });
    } catch (err) {
      if (alive.current) {
        setError(asIpmaError(err).message);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    let active = true;

    const bootstrap = async () => {
      const cached = await readJson<CachedLocations>(storageKeys.locations);
      if (active && cached?.locations?.length) {
        setLocations(cached.locations);
        setIsLoading(false);
      }

      await load();
      if (active) {
        setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      alive.current = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await load();
    if (alive.current) {
      setIsLoading(false);
    }
  }, [load]);

  return { locations, isLoading, error, refresh };
}
