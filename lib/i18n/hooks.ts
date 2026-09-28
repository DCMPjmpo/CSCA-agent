/**
 * i18n Hooks - CSCA Pilot Agent
 *
 * Uses a shared React Context so that all components react to locale changes
 * instantly — no refresh needed.
 */

import { useContext, useCallback, useEffect, useState } from 'react';
import { translations, LANGUAGES, getTranslation } from './translations';
import type { Translations } from './translations';
import { CscaI18nContext } from './csca-context';

export type StrictTranslations = Prettify<DeepRequired<Translations>>;

type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
  : NonNullable<T>;

type Prettify<T> = { [K in keyof T]: T[K] } & {};

// Helper to normalize locale code (e.g., 'zh-CN' -> 'zh', 'ms-MY' -> 'ms')
function normalizeLocale(locale: string): string {
  const parts = locale.split('-');
  return parts[0] || 'en';
}

export function useTranslation() {
  // Shared context — when locale changes in one component, all update instantly.
  const ctx = useContext(CscaI18nContext);

  // Fallback for use outside CscaI18nProvider (shouldn't happen in normal flow)
  const [locale, setLocale] = useState<string>('zh');

  useEffect(() => {
    if (ctx) return;
    const savedLocale = localStorage.getItem('csca_locale');
    if (savedLocale) {
      const normalized = normalizeLocale(savedLocale);
      if (translations[normalized]) {
        setLocale(normalized);
      }
    }
  }, [ctx]);

  const changeLocale = useCallback(
    (newLocale: string) => {
      if (ctx) return;
      const normalized = normalizeLocale(newLocale);
      if (translations[normalized]) {
        setLocale(normalized);
        localStorage.setItem('csca_locale', normalized);
      }
    },
    [ctx],
  );

  if (ctx) {
    return ctx;
  }

  const t = getTranslation(locale) as StrictTranslations;

  return {
    t,
    locale,
    changeLocale,
    languages: LANGUAGES,
  };
}

export function useLocale() {
  const ctx = useContext(CscaI18nContext);

  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    if (ctx) return;
    const savedLocale = localStorage.getItem('csca_locale');
    if (savedLocale && translations[savedLocale]) {
      setLocale(savedLocale);
    }
  }, [ctx]);

  const setLocaleWithStorage = useCallback(
    (newLocale: string) => {
      if (ctx) return;
      if (translations[newLocale]) {
        setLocale(newLocale);
        localStorage.setItem('csca_locale', newLocale);
      }
    },
    [ctx],
  );

  if (ctx) {
    return { locale: ctx.locale, setLocale: ctx.changeLocale };
  }

  return { locale, setLocale: setLocaleWithStorage };
}
