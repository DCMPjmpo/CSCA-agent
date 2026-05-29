/**
 * i18n Hooks - CSCA Pilot Agent
 */

import { useState, useCallback, useEffect } from 'react';
import { translations, LANGUAGES, getTranslation, type Translations } from './translations';

// Helper to normalize locale code (e.g., 'zh-CN' -> 'zh', 'ms-MY' -> 'ms')
function normalizeLocale(locale: string): string {
    const parts = locale.split('-');
    return parts[0] || 'en';
}

export function useTranslation() {
    const [locale, setLocale] = useState<string>('zh');

    useEffect(() => {
        const savedLocale = localStorage.getItem('csca_locale');
        if (savedLocale) {
            const normalized = normalizeLocale(savedLocale);
            if (translations[normalized]) {
                setLocale(normalized);
            }
        }
    }, []);

    const changeLocale = useCallback((newLocale: string) => {
        const normalized = normalizeLocale(newLocale);
        if (translations[normalized]) {
            setLocale(normalized);
            localStorage.setItem('csca_locale', normalized);
        }
    }, []);

    const t = getTranslation(locale);

    return {
        t,
        locale,
        changeLocale,
        languages: LANGUAGES,
    };
}

export function useLocale() {
    const [locale, setLocale] = useState<string>('en');

    useEffect(() => {
        const savedLocale = localStorage.getItem('csca_locale');
        if (savedLocale && translations[savedLocale]) {
            setLocale(savedLocale);
        }
    }, []);

    const setLocaleWithStorage = useCallback((newLocale: string) => {
        if (translations[newLocale]) {
            setLocale(newLocale);
            localStorage.setItem('csca_locale', newLocale);
        }
    }, []);

    return { locale, setLocale: setLocaleWithStorage };
}
