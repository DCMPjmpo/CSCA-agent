'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { supportedLocales } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  /** Called when the dropdown opens, so parent can close sibling dropdowns */
  onOpen?: () => void;
}

// 语言标志映射
const languageFlags: Record<string, string> = {
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  'en-US': 'US',
  'th-TH': 'TH',
  'vi-VN': 'VN',
  'id-ID': 'ID',
  'ms-MY': 'MY',
  'tl-PH': 'PH',
  'ja-JP': 'JP',
  'ru-RU': 'RU',
  'ar-SA': 'AR',
};

export function LanguageSwitcher({ onOpen }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  const currentLocale = supportedLocales.find((l) => l.code === locale);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) onOpen?.();
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600 hover:border-indigo-500 transition-all shadow-md hover:shadow-lg"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLocale?.shortLabel ?? locale}</span>
        <span className="text-xs opacity-60">{currentLocale?.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px]">
          <div className="p-2 border-b border-slate-700">
            <span className="text-xs text-slate-400 px-2">Select Language / Chọn Ngôn ngữ / Pilih Bahasa</span>
          </div>
          {supportedLocales.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-700/50 transition-all',
                locale === l.code &&
                'bg-indigo-600/30 text-indigo-300',
              )}
            >
              <span className="w-6 h-6 flex items-center justify-center bg-slate-600 rounded text-xs font-bold">
                {languageFlags[l.code] || l.shortLabel}
              </span>
              <span className="flex-1">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
