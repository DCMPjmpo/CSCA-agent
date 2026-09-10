'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import i18n from '@/lib/i18n/config';
import { type Locale, defaultLocale, supportedLocales } from '@/lib/i18n';

const LOCALE_STORAGE_KEY = 'locale';

/** Match a browser language code (e.g. 'en', 'zh-TW') to a supported locale */
function resolveLocale(lang: string): Locale {
  // Exact match
  const exact = supportedLocales.find((l) => l.code === lang);
  if (exact) return exact.code;
  // Prefix match: 'en' → 'en-US', 'zh' → 'zh-CN'
  const prefix = lang.split('-')[0].toLowerCase();
  const match = supportedLocales.find((l) => l.code.toLowerCase().startsWith(prefix));
  return match?.code ?? defaultLocale;
}

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // [HYDRATION-FIX] Use useState instead of react-i18next useTranslation()
  // to avoid useSyncExternalStore mismatches between server and client.
  // react-i18next useTranslation() uses useSyncExternalStore with the same
  // getSnapshot for server and client. When resources load asynchronously
  // on the client, the snapshot differs, causing hydration errors.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Detect language after hydration to avoid SSR mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      const raw = stored || navigator.language || defaultLocale;
      const target = resolveLocale(raw);
      if (target !== locale) {
        setLocaleState(target);
        i18n.changeLanguage(target);
      }
    } catch {
      // localStorage unavailable, keep default
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    i18n.changeLanguage(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
  };

  // Use i18n.t directly — avoids useSyncExternalStore subscription.
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, { ...(options ?? {}), lng: locale });

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
