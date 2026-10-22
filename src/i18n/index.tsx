import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, storageKeys, writeJson } from '@/storage/storage';
import { type Language, type TranslationKey, translations } from './translations';

type Params = Record<string, string | number>;

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Params) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: Params) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    let active = true;

    readJson<Language>(storageKeys.language).then((stored) => {
      if (active && (stored === 'pt' || stored === 'en')) {
        setLanguageState(stored);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void writeJson(storageKeys.language, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dictionary = translations[language];

    return {
      language,
      setLanguage,
      t: (key, params) => interpolate(dictionary[key], params),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }

  return context;
}

export type { Language, TranslationKey };
