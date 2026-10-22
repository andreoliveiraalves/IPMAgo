import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { fetchReferenceData } from '@/api/ipma';
import type { ReferenceData } from '@/api/ipma/types';
import { useI18n } from '@/i18n';
import { readJson, storageKeys, writeJson } from '@/storage/storage';

type ReferenceValue = {
  /** Human label for an IPMA `idWeatherType`, in the active language. */
  weatherLabel: (weatherTypeId: number) => string;
  /** Human label for an IPMA `classWindSpeed`, in the active language. */
  windLabel: (windClass: number) => string;
  hasData: boolean;
};

const ReferenceContext = createContext<ReferenceValue | null>(null);

const FALLBACK = '—';

export function ReferenceDataProvider({ children }: { children: React.ReactNode }) {
  const { language } = useI18n();
  const [data, setData] = useState<ReferenceData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const cached = await readJson<ReferenceData>(storageKeys.reference);
      if (active && cached?.weatherTypes) {
        setData(cached);
      }

      try {
        const fresh = await fetchReferenceData();
        if (active) {
          setData(fresh);
          void writeJson(storageKeys.reference, fresh);
        }
      } catch {
        // Keep whatever cached reference data we have; codes still render via emoji.
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ReferenceValue>(
    () => ({
      weatherLabel: (weatherTypeId) => {
        const entry = data?.weatherTypes[weatherTypeId];
        const label = language === 'pt' ? entry?.pt : entry?.en;

        return label && label !== '---' ? label : FALLBACK;
      },
      windLabel: (windClass) => {
        const entry = data?.windClasses[windClass];
        const label = language === 'pt' ? entry?.pt : entry?.en;

        return label && label !== '---' ? label : FALLBACK;
      },
      hasData: data !== null,
    }),
    [data, language]
  );

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}

export function useReferenceData(): ReferenceValue {
  const context = useContext(ReferenceContext);

  if (!context) {
    throw new Error('useReferenceData must be used inside <ReferenceDataProvider>');
  }

  return context;
}

export function useWeatherLabel(weatherTypeId: number): string {
  return useReferenceData().weatherLabel(weatherTypeId);
}

export function useWindLabel(windClass: number): string {
  return useReferenceData().windLabel(windClass);
}
