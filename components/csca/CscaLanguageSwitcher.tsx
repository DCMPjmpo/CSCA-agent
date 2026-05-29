'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';

export function CscaLanguageSwitcher() {
  const { locale, changeLocale, languages } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = languages.find((l) => l.code === locale);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium text-zinc-300 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
        aria-label="Switch language"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current?.flag}</span>
        <span className="hidden sm:inline max-w-[100px] truncate">{current?.name}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[180px] py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                changeLocale(lang.code);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                locale === lang.code
                  ? 'text-white bg-white/[0.08]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
              {locale === lang.code && <Check className="w-4 h-4 text-indigo-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
