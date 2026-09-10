'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  translations,
  LANGUAGES,
  getTranslation,
} from './translations';
import type { StrictTranslations } from './hooks';

type CscaI18nContextValue = {
  locale: string;
  t: StrictTranslations;
  changeLocale: (newLocale: string) => void;
  languages: typeof LANGUAGES;
};

export const CscaI18nContext = createContext<CscaI18nContextValue | null>(null);

const HTML_LANG: Record<string, string> = {
  zh: 'zh-CN',
  th: 'th',
  vi: 'vi',
  id: 'id',
  ms: 'ms-MY',
  tl: 'tl-PH',
  en: 'en',
  my: 'my',
  km: 'km',
  lo: 'lo',
  ja: 'ja-JP',
  fr: 'fr-FR',
};

export function CscaI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('zh');

  useEffect(() => {
    const saved = localStorage.getItem('csca_locale');
    if (saved && translations[saved]) {
      setLocale(saved);
      document.documentElement.lang = HTML_LANG[saved] ?? saved;
    }
  }, []);

  const changeLocale = useCallback((newLocale: string) => {
    if (!translations[newLocale]) return;
    setLocale(newLocale);
    localStorage.setItem('csca_locale', newLocale);
    document.documentElement.lang = HTML_LANG[newLocale] ?? newLocale;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      t: getTranslation(locale) as StrictTranslations,
      changeLocale,
      languages: LANGUAGES,
    }),
    [locale, changeLocale],
  );

  return (
    <CscaI18nContext.Provider value={value}>{children}</CscaI18nContext.Provider>
  );
}

export function useCscaTranslation(): CscaI18nContextValue {
  const ctx = useContext(CscaI18nContext);
  if (!ctx) {
    throw new Error('useCscaTranslation must be used within CscaI18nProvider');
  }
  return ctx;
}
