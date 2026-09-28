'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';

export function CscaLanguageSwitcher({ dropUp = false }: { dropUp?: boolean }) {
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
        className="flex items-center gap-2 px-3 py-2 rounded-none text-xs font-medium text-ricepaper bg-[#081B24] border border-[#A68B5B] hover:bg-[#0F2D3A] transition-colors"
        aria-label="Switch language"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 text-[#A68B5B]" />
        <span>{current?.flag}</span>
        <span className="hidden sm:inline max-w-[100px] truncate">{current?.name}</span>
      </button>
      {open && (
        <div
          className={`absolute ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 bg-[#FAF5EC] border border-[#A68B5B] rounded-none overflow-hidden z-50 min-w-[200px] py-1`}
          style={{ boxShadow: '3px 3px 0 #020b10' }}
        >
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
                  ? 'text-[#2D5A4A] bg-[#2D5A4A]/8'
                  : 'text-[#3B1D0C] hover:text-[#2D5A4A] hover:bg-[#A68B5B]/8',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
              {locale === lang.code && <Check className="w-4 h-4 text-[#2D5A4A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
