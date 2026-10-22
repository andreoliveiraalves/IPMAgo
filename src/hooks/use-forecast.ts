import { useMemo } from 'react';

import { EMPTY_ENTRY, type ForecastEntry, useForecastList } from './use-forecast-list';

export function useForecast(globalIdLocal: number | null): {
  entry: ForecastEntry;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
} {
  const ids = useMemo(
    () => (globalIdLocal === null ? [] : [globalIdLocal]),
    [globalIdLocal]
  );
  const { entries, isRefreshing, refresh } = useForecastList(ids);

  const entry = globalIdLocal === null ? EMPTY_ENTRY : (entries[globalIdLocal] ?? EMPTY_ENTRY);

  return { entry, isRefreshing, refresh };
}
